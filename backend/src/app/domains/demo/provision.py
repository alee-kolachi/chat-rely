"""Provision a demo outreach store end-to-end."""

from __future__ import annotations

import asyncio
import json
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session_factory
from app.domains.demo.agents import create_demo_agent
from app.domains.demo.constants import DEMO_TTL_DAYS
from app.domains.demo.repository import build_demo_slug, demo_public_url, normalize_store_host
from app.domains.demo.schemas import DemoProductSnapshot
from app.domains.demo.storefront_ingest import (
    build_suggested_prompts,
    ingest_public_storefront,
    product_to_index_text,
)
from app.domains.knowledge.service import (
    create_and_index_text_snippet,
    create_source,
    enqueue_index_website_source_queued,
)
from app.domains.knowledge.schemas import KnowledgeSourceCreateRequest

log = structlog.get_logger("demo.provision")

_INDEX_POLL_SECONDS = 3.0
_INDEX_TIMEOUT_SECONDS = 900.0


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
    products: list[DemoProductSnapshot],
    policies: dict[str, str],
    ingest_source: str,
    suggested_prompts: list[str],
    sheet_ref: dict[str, Any] | None,
    sheet_snapshot: dict[str, Any] | None,
    status: str = "indexing",
) -> None:
    products_json = [p.model_dump() for p in products]
    await db.execute(
        text(
            """
            insert into public.demo_catalog_snapshots (
              agent_id, products, policies, ingest_source, ingested_at
            ) values (
              cast(:agent_id as uuid),
              cast(:products as jsonb),
              cast(:policies as jsonb),
              :ingest_source,
              now()
            )
            on conflict (agent_id) do update set
              products = excluded.products,
              policies = excluded.policies,
              ingest_source = excluded.ingest_source,
              ingested_at = now()
            """
        ),
        {
            "agent_id": str(agent_id),
            "products": json.dumps(products_json),
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
            "product_count": len(products),
            "suggested_prompts": json.dumps(suggested_prompts),
            "sheet_ref": json.dumps(sheet_ref or {}),
            "sheet_snapshot": json.dumps(sheet_snapshot or {}),
        },
    )
    await db.commit()


async def _index_demo_knowledge(
    db: AsyncSession,
    *,
    user_id: UUID,
    agent_id: UUID,
    base_url: str,
    products: list[DemoProductSnapshot],
    policies: dict[str, str],
) -> UUID | None:
    website_source = await create_source(
        db,
        user_id,
        KnowledgeSourceCreateRequest(
            agent_id=agent_id,
            type="website",
            title=base_url,
            source_url=base_url,
            metadata={"origin": "demo_outreach", "website_mode": "full_site"},
        ),
    )
    _, website_job = await enqueue_index_website_source_queued(db, website_source.id, user_id)

    batch_size = 25
    for i in range(0, len(products), batch_size):
        batch = products[i : i + batch_size]
        body = "\n\n---\n\n".join(product_to_index_text(p) for p in batch)
        title = f"Catalog {i // batch_size + 1}"
        await create_and_index_text_snippet(
            db,
            user_id=user_id,
            agent_id=agent_id,
            title=title,
            snippet_text=body,
        )

    for key, policy_text in policies.items():
        await create_and_index_text_snippet(
            db,
            user_id=user_id,
            agent_id=agent_id,
            title=f"Policy: {key}",
            snippet_text=policy_text,
        )

    await db.commit()
    return website_job.id if website_job else None


async def _wait_for_agent_indexing(agent_id: UUID) -> bool:
    deadline = asyncio.get_event_loop().time() + _INDEX_TIMEOUT_SECONDS
    sf = get_session_factory()
    while asyncio.get_event_loop().time() < deadline:
        async with sf() as db:
            row = (
                await db.execute(
                    text(
                        """
                        select
                          count(*) filter (where j.status in ('queued', 'running')) as pending,
                          count(*) filter (where j.status = 'failed') as failed
                        from public.indexing_jobs j
                        join public.knowledge_sources ks on ks.id = j.knowledge_source_id
                        where ks.agent_id = cast(:agent_id as uuid)
                        """
                    ),
                    {"agent_id": str(agent_id)},
                )
            ).mappings().one()
        pending = int(row["pending"] or 0)
        failed = int(row["failed"] or 0)
        if failed > 0:
            return False
        if pending == 0:
            return True
        await asyncio.sleep(_INDEX_POLL_SECONDS)
    return False


async def _set_demo_status(db: AsyncSession, agent_id: UUID, status: str) -> None:
    await db.execute(
        text(
            """
            update public.demo_outreach
            set status = cast(:status as public.demo_outreach_status)
            where agent_id = cast(:agent_id as uuid)
            """
        ),
        {"agent_id": str(agent_id), "status": status},
    )
    await db.commit()


async def provision_demo_from_store_url(
    db: AsyncSession,
    *,
    store_url: str,
    sheet_ref: dict[str, Any] | None = None,
    sheet_snapshot: dict[str, Any] | None = None,
    run_qa: bool = True,
) -> dict[str, Any]:
    from app.domains.demo.qa_judge import run_demo_qa_suite
    from app.domains.demo.system_user import ensure_demo_system_user

    ingest = await ingest_public_storefront(store_url)
    if not ingest.ok:
        return {
            "ok": False,
            "status": "failed",
            "reason": "insufficient_catalog",
            "product_count": len(ingest.products),
        }

    user_id = await ensure_demo_system_user(db)
    display_name = ingest.display_name or normalize_store_host(store_url)
    slug = build_demo_slug(display_name)
    agent_id, _public_key = await create_demo_agent(db, name=f"{display_name} Demo")

    suggested = build_suggested_prompts(ingest.products, ingest.policies)
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
        products=ingest.products,
        policies=ingest.policies,
        ingest_source=ingest.ingest_source,
        suggested_prompts=suggested,
        sheet_ref=sheet_ref,
        sheet_snapshot=sheet_snapshot,
        status="indexing",
    )

    job_id = await _index_demo_knowledge(
        db,
        user_id=user_id,
        agent_id=agent_id,
        base_url=ingest.base_url,
        products=ingest.products,
        policies=ingest.policies,
    )

    _ = job_id
    indexed = await _wait_for_agent_indexing(agent_id)
    if not indexed:
        await _set_demo_status(db, agent_id, "failed")
        return {
            "ok": False,
            "status": "failed",
            "reason": "indexing_failed",
            "agent_id": str(agent_id),
            "slug": slug,
            "url": demo_public_url(slug),
        }

    if run_qa:
        await _set_demo_status(db, agent_id, "qa_running")
        qa_result = await run_demo_qa_suite(db, agent_id=agent_id, user_id=user_id)
        final_status = str(qa_result.get("status") or "needs_review")
    else:
        final_status = "ready"
        qa_result = {"status": final_status, "skipped": True}

    ready_at = datetime.now(UTC)
    expires_at = ready_at + timedelta(days=DEMO_TTL_DAYS)
    await db.execute(
        text(
            """
            update public.demo_outreach
            set
              status = cast(:status as public.demo_outreach_status),
              qa_report = cast(:qa_report as jsonb),
              ready_at = case when :status = 'ready' then :ready_at else ready_at end,
              expires_at = case when :status = 'ready' then :expires_at else expires_at end
            where agent_id = cast(:agent_id as uuid)
            """
        ),
        {
            "agent_id": str(agent_id),
            "status": final_status,
            "qa_report": json.dumps(qa_result),
            "ready_at": ready_at,
            "expires_at": expires_at,
        },
    )
    await db.commit()

    return {
        "ok": final_status == "ready",
        "status": final_status,
        "agent_id": str(agent_id),
        "slug": slug,
        "url": demo_public_url(slug),
        "product_count": len(ingest.products),
        "qa_report": qa_result,
    }
