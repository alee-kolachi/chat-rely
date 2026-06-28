"""Demo outreach DB helpers."""

from __future__ import annotations

import json
import re
from typing import Any
from urllib.parse import urlparse
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.domains.demo.constants import DEMO_PUBLIC_BASE_URL
from app.domains.demo.schemas import DemoOutreachDTO


def slugify_store_name(value: str) -> str:
    candidate = re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")
    return candidate or "store"


def base_demo_slug(display_name: str) -> str:
    """Human-readable demo path segment (no random suffix)."""
    return slugify_store_name(display_name)


def build_demo_slug(display_name: str) -> str:
    """Sync helper for tests; production uses allocate_demo_slug."""
    return base_demo_slug(display_name)


async def allocate_demo_slug(db: AsyncSession, display_name: str) -> str:
    """Pick a unique slug like ``patrick-james``, adding ``-2`` only on collision."""
    base = base_demo_slug(display_name)
    slug = base
    suffix = 2
    while await fetch_demo_by_slug(db, slug) is not None:
        slug = f"{base}-{suffix}"
        suffix += 1
    return slug


def normalize_store_host(store_url: str) -> str:
    parsed = urlparse(store_url.strip())
    host = (parsed.netloc or parsed.path or "").lower().strip()
    if host.startswith("www."):
        host = host[4:]
    if not host:
        raise AppError(code="demo.invalid_store_url", message="Invalid store URL", status_code=422)
    return host


def demo_public_url(slug: str) -> str:
    return f"{DEMO_PUBLIC_BASE_URL}/demo/{slug}"


def _row_to_dto(row: Any) -> DemoOutreachDTO:
    data = dict(row)
    prompts = data.get("suggested_prompts")
    if isinstance(prompts, str):
        prompts = json.loads(prompts)
    if not isinstance(prompts, list):
        prompts = []
    for key in ("sheet_ref", "sheet_snapshot", "qa_report"):
        val = data.get(key)
        if isinstance(val, str):
            data[key] = json.loads(val)
        elif val is None:
            data[key] = {}
    data["suggested_prompts"] = [str(p) for p in prompts]
    return DemoOutreachDTO.model_validate(data)


async def fetch_demo_by_slug(db: AsyncSession, slug: str) -> DemoOutreachDTO | None:
    row = (
        await db.execute(
            text(
                """
                select
                  agent_id, slug, store_url, store_host, status::text as status,
                  display_name, logo_url, brand_color, product_count, suggested_prompts,
                  sheet_ref, sheet_snapshot, qa_report, lifetime_message_count,
                  ready_at, expires_at, created_at
                from public.demo_outreach
                where slug = :slug
                limit 1
                """
            ),
            {"slug": slug.strip()},
        )
    ).mappings().first()
    return _row_to_dto(row) if row else None


async def fetch_demo_by_agent_id(db: AsyncSession, agent_id: UUID) -> DemoOutreachDTO | None:
    row = (
        await db.execute(
            text(
                """
                select
                  agent_id, slug, store_url, store_host, status::text as status,
                  display_name, logo_url, brand_color, product_count, suggested_prompts,
                  sheet_ref, sheet_snapshot, qa_report, lifetime_message_count,
                  ready_at, expires_at, created_at
                from public.demo_outreach
                where agent_id = cast(:agent_id as uuid)
                limit 1
                """
            ),
            {"agent_id": str(agent_id)},
        )
    ).mappings().first()
    return _row_to_dto(row) if row else None


async def agent_is_demo(db: AsyncSession, agent_id: UUID) -> bool:
    row = (
        await db.execute(
            text(
                """
                select is_demo
                from public.agents
                where id = cast(:agent_id as uuid)
                limit 1
                """
            ),
            {"agent_id": str(agent_id)},
        )
    ).mappings().first()
    return bool(row and row.get("is_demo"))


async def fetch_demo_public_page_row(
    db: AsyncSession, slug: str
) -> tuple[DemoOutreachDTO, list[dict[str, Any]]] | None:
    """Demo row plus first six catalog products in one round trip."""
    row = (
        await db.execute(
            text(
                """
                select
                  d.agent_id, d.slug, d.store_url, d.store_host, d.status::text as status,
                  d.display_name, d.logo_url, d.brand_color, d.product_count, d.suggested_prompts,
                  d.sheet_ref, d.sheet_snapshot, d.qa_report, d.lifetime_message_count,
                  d.ready_at, d.expires_at, d.created_at,
                  coalesce(
                    (
                      select jsonb_agg(p.elem)
                      from (
                        select elem
                        from jsonb_array_elements(s.products) as elem
                        limit 6
                      ) p
                    ),
                    '[]'::jsonb
                  ) as top_products_raw
                from public.demo_outreach d
                left join public.demo_catalog_snapshots s on s.agent_id = d.agent_id
                where d.slug = :slug
                limit 1
                """
            ),
            {"slug": slug.strip()},
        )
    ).mappings().first()
    if not row:
        return None
    data = dict(row)
    raw_products = data.pop("top_products_raw", None)
    if isinstance(raw_products, str):
        raw_products = json.loads(raw_products)
    if not isinstance(raw_products, list):
        raw_products = []
    products = [p for p in raw_products if isinstance(p, dict)]
    return _row_to_dto(data), products


async def fetch_demo_policies(db: AsyncSession, agent_id: UUID) -> dict[str, str]:
    row = (
        await db.execute(
            text(
                """
                select policies
                from public.demo_catalog_snapshots
                where agent_id = cast(:agent_id as uuid)
                limit 1
                """
            ),
            {"agent_id": str(agent_id)},
        )
    ).mappings().first()
    if not row:
        return {}
    policies = row.get("policies")
    if isinstance(policies, str):
        policies = json.loads(policies)
    if not isinstance(policies, dict):
        return {}
    return {str(k): str(v) for k, v in policies.items() if v}


async def fetch_demo_store_url(db: AsyncSession, agent_id: UUID) -> str | None:
    row = (
        await db.execute(
            text(
                """
                select store_url
                from public.demo_outreach
                where agent_id = cast(:agent_id as uuid)
                limit 1
                """
            ),
            {"agent_id": str(agent_id)},
        )
    ).mappings().first()
    if not row:
        return None
    url = str(row.get("store_url") or "").strip()
    return url or None


async def fetch_catalog_snapshot(
    db: AsyncSession, agent_id: UUID
) -> tuple[list[dict[str, Any]], dict[str, str]]:
    row = (
        await db.execute(
            text(
                """
                select products, policies
                from public.demo_catalog_snapshots
                where agent_id = cast(:agent_id as uuid)
                limit 1
                """
            ),
            {"agent_id": str(agent_id)},
        )
    ).mappings().first()
    if not row:
        return [], {}
    products = row.get("products")
    policies = row.get("policies")
    if isinstance(products, str):
        products = json.loads(products)
    if isinstance(policies, str):
        policies = json.loads(policies)
    if not isinstance(products, list):
        products = []
    if not isinstance(policies, dict):
        policies = {}
    return products, {str(k): str(v) for k, v in policies.items() if v}


async def increment_demo_lifetime_messages(db: AsyncSession, agent_id: UUID) -> int:
    row = (
        await db.execute(
            text(
                """
                update public.demo_outreach
                set lifetime_message_count = lifetime_message_count + 1
                where agent_id = cast(:agent_id as uuid)
                returning lifetime_message_count
                """
            ),
            {"agent_id": str(agent_id)},
        )
    ).mappings().one()
    return int(row["lifetime_message_count"] or 0)


async def update_demo_logo_url(
    db: AsyncSession, *, agent_id: UUID, logo_url: str | None
) -> None:
    await db.execute(
        text(
            """
            update public.demo_outreach
            set logo_url = :logo_url
            where agent_id = cast(:agent_id as uuid)
            """
        ),
        {"agent_id": str(agent_id), "logo_url": logo_url},
    )
    await db.commit()


async def increment_demo_visitor_messages(
    db: AsyncSession, *, agent_id: UUID, visitor_id: str
) -> int:
    row = (
        await db.execute(
            text(
                """
                insert into public.demo_visitor_usage (demo_agent_id, visitor_id, message_count, updated_at)
                values (cast(:agent_id as uuid), :visitor_id, 1, now())
                on conflict (demo_agent_id, visitor_id)
                do update set
                  message_count = public.demo_visitor_usage.message_count + 1,
                  updated_at = now()
                returning message_count
                """
            ),
            {"agent_id": str(agent_id), "visitor_id": visitor_id.strip()},
        )
    ).mappings().one()
    return int(row["message_count"] or 0)
