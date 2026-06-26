"""Provision a demo outreach store end-to-end."""

from __future__ import annotations

import json
from typing import Any
from uuid import UUID

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.demo.agents import create_demo_agent
from app.domains.demo.progress import demo_step
from app.domains.demo.repository import build_demo_slug, demo_public_url, normalize_store_host
from app.domains.demo.storefront_ingest import (
    build_suggested_prompts,
    ingest_demo_for_provision,
)

log = structlog.get_logger("demo.provision")


async def _persist_snapshot_and_outreach(
    db: AsyncSession,
    *,
    agent_id: UUID,
    slug: str,
    store_url: str,
    store_host: str,
    display_name: str,
    logo_url: str | None,
    brand_color: str | None,
    policies: dict[str, str],
    ingest_source: str,
    suggested_prompts: list[str],
    sheet_ref: dict[str, Any] | None,
    sheet_snapshot: dict[str, Any] | None,
    product_count: int,
    status: str = "needs_review",
) -> None:
    await db.execute(
        text(
            """
            insert into public.demo_catalog_snapshots (
              agent_id, products, policies, ingest_source, ingested_at
            ) values (
              cast(:agent_id as uuid),
              '[]'::jsonb,
              cast(:policies as jsonb),
              :ingest_source,
              now()
            )
            on conflict (agent_id) do update set
              products = '[]'::jsonb,
              policies = excluded.policies,
              ingest_source = excluded.ingest_source,
              ingested_at = now()
            """
        ),
        {
            "agent_id": str(agent_id),
            "policies": json.dumps(policies),
            "ingest_source": ingest_source,
        },
    )
    await db.execute(
        text(
            """
            insert into public.demo_outreach (
              agent_id, slug, store_url, store_host, status, display_name, logo_url, brand_color,
              product_count, suggested_prompts, sheet_ref, sheet_snapshot
            ) values (
              cast(:agent_id as uuid),
              :slug,
              :store_url,
              :store_host,
              cast(:status as public.demo_outreach_status),
              :display_name,
              :logo_url,
              :brand_color,
              :product_count,
              cast(:suggested_prompts as jsonb),
              cast(:sheet_ref as jsonb),
              cast(:sheet_snapshot as jsonb)
            )
            on conflict (agent_id) do update set
              slug = excluded.slug,
              store_url = excluded.store_url,
              store_host = excluded.store_host,
              status = excluded.status,
              display_name = excluded.display_name,
              logo_url = excluded.logo_url,
              brand_color = excluded.brand_color,
              product_count = excluded.product_count,
              suggested_prompts = excluded.suggested_prompts,
              sheet_ref = excluded.sheet_ref,
              sheet_snapshot = excluded.sheet_snapshot
            """
        ),
        {
            "agent_id": str(agent_id),
            "slug": slug,
            "store_url": store_url,
            "store_host": store_host,
            "status": status,
            "display_name": display_name,
            "logo_url": logo_url,
            "brand_color": brand_color,
            "product_count": product_count,
            "suggested_prompts": json.dumps(suggested_prompts),
            "sheet_ref": json.dumps(sheet_ref or {}),
            "sheet_snapshot": json.dumps(sheet_snapshot or {}),
        },
    )
    await db.commit()


async def provision_demo_from_store_url(
    db: AsyncSession,
    *,
    store_url: str,
    sheet_ref: dict[str, Any] | None = None,
    sheet_snapshot: dict[str, Any] | None = None,
) -> dict[str, Any]:
    from app.domains.demo.demo_site_index import index_demo_site_pages
    from app.domains.demo.system_user import ensure_demo_system_user

    demo_step("provision.start", store=store_url)

    demo_step("provision.ingest", store=store_url)
    ingest = await ingest_demo_for_provision(store_url)
    if not ingest.ok:
        demo_step(
            "sheet.row_failed",
            store=store_url,
            reason=f"insufficient_catalog ({ingest.product_count_estimate} products)",
        )
        return {
            "ok": False,
            "status": "failed",
            "reason": "insufficient_catalog",
            "product_count": ingest.product_count_estimate,
        }

    display_name = ingest.display_name or normalize_store_host(store_url)
    demo_step(
        "provision.ingest_done",
        store=store_url,
        display_name=display_name,
        products=ingest.product_count_estimate,
        policies=len(ingest.policies),
    )

    user_id = await ensure_demo_system_user(db)
    slug = build_demo_slug(display_name)
    demo_step("provision.agent", display_name=display_name, slug=slug)
    agent_id, _public_key = await create_demo_agent(db, name=f"{display_name} Demo")

    suggested = build_suggested_prompts([], ingest.policies)
    store_host = normalize_store_host(ingest.base_url)

    await _persist_snapshot_and_outreach(
        db,
        agent_id=agent_id,
        slug=slug,
        store_url=ingest.base_url,
        store_host=store_host,
        display_name=display_name,
        logo_url=ingest.logo_url,
        brand_color=ingest.brand_color,
        policies=ingest.policies,
        ingest_source=ingest.ingest_source,
        suggested_prompts=suggested,
        sheet_ref=sheet_ref,
        sheet_snapshot=sheet_snapshot,
        product_count=ingest.product_count_estimate,
        status="needs_review",
    )

    demo_step("provision.index_site", slug=slug)
    await index_demo_site_pages(
        db,
        user_id=user_id,
        agent_id=agent_id,
        base_url=ingest.base_url,
        slug=slug,
    )

    final_status = "needs_review"
    url = demo_public_url(slug)
    demo_step(
        "provision.complete",
        display_name=display_name,
        slug=slug,
        url=url,
        status=final_status,
        products=ingest.product_count_estimate,
    )

    return {
        "ok": True,
        "status": final_status,
        "agent_id": str(agent_id),
        "slug": slug,
        "url": url,
        "product_count": ingest.product_count_estimate,
    }
