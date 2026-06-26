"""Fetch and cache demo product catalogs (deferred until demo page load)."""

from __future__ import annotations

import json
from typing import Any
from uuid import UUID

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.domains.demo.demo_catalog_cache import cache_demo_catalog, get_demo_catalog_cache
from app.domains.demo.repository import fetch_catalog_snapshot, fetch_demo_by_slug
from app.domains.demo.schemas import DemoTopProduct
from app.domains.demo.service import build_top_products
from app.domains.demo.storefront_ingest import (
    build_suggested_prompts,
    fetch_storefront_product_catalog,
)

log = structlog.get_logger("demo.product_catalog")

# Legacy ingests only stored the first products.json page (~250 items).
_STALE_SNAPSHOT_PRODUCT_CAP = 300


async def _persist_catalog_products(
    db: AsyncSession,
    *,
    agent_id: UUID,
    products: list[dict[str, Any]],
    product_count: int,
    suggested_prompts: list[str],
) -> None:
    await db.execute(
        text(
            """
            update public.demo_catalog_snapshots
            set products = cast(:products as jsonb), ingested_at = now()
            where agent_id = cast(:agent_id as uuid)
            """
        ),
        {"agent_id": str(agent_id), "products": json.dumps(products)},
    )
    await db.execute(
        text(
            """
            update public.demo_outreach
            set product_count = :product_count,
                suggested_prompts = cast(:suggested_prompts as jsonb)
            where agent_id = cast(:agent_id as uuid)
            """
        ),
        {
            "agent_id": str(agent_id),
            "product_count": product_count,
            "suggested_prompts": json.dumps(suggested_prompts),
        },
    )
    await db.commit()


async def ensure_demo_product_catalog(
    db: AsyncSession,
    *,
    agent_id: UUID,
    store_url: str,
    policies: dict[str, str] | None = None,
    force_refresh: bool = False,
) -> tuple[list[dict[str, Any]], dict[str, str], str]:
    """Load products from cache, DB snapshot, or live storefront fetch."""
    cached = None if force_refresh else get_demo_catalog_cache(agent_id)
    if cached is not None and cached.products:
        return cached.products, cached.policies, cached.compact_index

    resolved_policies = policies
    if resolved_policies is None:
        _products, resolved_policies = await fetch_catalog_snapshot(db, agent_id)

    db_products, _ = await fetch_catalog_snapshot(db, agent_id)
    if db_products and not force_refresh:
        if len(db_products) <= _STALE_SNAPSHOT_PRODUCT_CAP:
            log.info(
                "demo.catalog_partial_snapshot_refresh",
                agent_id=str(agent_id),
                stored=len(db_products),
            )
            force_refresh = True
        else:
            entry = cache_demo_catalog(agent_id, db_products, resolved_policies or {})
            return entry.products, entry.policies, entry.compact_index

    snapshots = await fetch_storefront_product_catalog(store_url)
    products = [p.model_dump() for p in snapshots]
    if len(products) < 1:
        raise AppError(
            code="demo.catalog_unavailable",
            message="Could not load this store's product catalog",
            status_code=503,
        )

    policy_map = resolved_policies or {}
    suggested = build_suggested_prompts(snapshots, policy_map)
    await _persist_catalog_products(
        db,
        agent_id=agent_id,
        products=products,
        product_count=len(products),
        suggested_prompts=suggested,
    )
    entry = cache_demo_catalog(agent_id, products, policy_map)
    log.info("demo.catalog_loaded", agent_id=str(agent_id), products=len(products))
    return entry.products, entry.policies, entry.compact_index


async def load_demo_catalog_for_slug(
    db: AsyncSession,
    slug: str,
    *,
    force_refresh: bool = False,
) -> dict[str, Any]:
    demo = await fetch_demo_by_slug(db, slug)
    if demo is None:
        raise AppError(code="demo.not_found", message="Demo not found", status_code=404)

    _products, policies = await fetch_catalog_snapshot(db, demo.agent_id)
    products, _, _compact = await ensure_demo_product_catalog(
        db,
        agent_id=demo.agent_id,
        store_url=demo.store_url,
        policies=policies,
        force_refresh=force_refresh,
    )
    top = build_top_products(products)
    from app.domains.demo.schemas import DemoProductSnapshot

    suggested = build_suggested_prompts(
        [DemoProductSnapshot.model_validate(p) for p in products[:6]],
        policies,
    )

    return {
        "product_count": len(products),
        "top_products": [t.model_dump() for t in top],
        "suggested_prompts": suggested,
        "catalog_ready": True,
    }
