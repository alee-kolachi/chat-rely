"""DB queue for demo outreach provisioning."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import structlog
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.demo.repository import normalize_store_host
from app.domains.demo.system_user import ensure_demo_system_user

log = structlog.get_logger("demo.provision_jobs")

_STALE_RUNNING_MINUTES = 45


async def find_active_job_for_store(db: AsyncSession, store_host: str) -> UUID | None:
    row = (
        await db.execute(
            text(
                """
                select id
                from public.demo_provision_jobs
                where store_host = :store_host
                  and status in ('queued', 'running')
                order by created_at asc
                limit 1
                """
            ),
            {"store_host": store_host},
        )
    ).mappings().first()
    return UUID(str(row["id"])) if row else None


async def enqueue_demo_provision_job(
    db: AsyncSession,
    *,
    store_url: str,
    sheet_ref: dict[str, Any],
    sheet_snapshot: dict[str, Any],
    triggered_by: str = "sheets_sync",
) -> UUID | None:
    """Insert a queued job, or return None when this store already has an active job."""
    store_host = normalize_store_host(store_url)
    existing = await find_active_job_for_store(db, store_host)
    if existing is not None:
        return None

    user_id = await ensure_demo_system_user(db)
    try:
        row = (
            await db.execute(
                text(
                    """
                    insert into public.demo_provision_jobs (
                      store_url, store_host, user_id, triggered_by, sheet_ref, sheet_snapshot
                    ) values (
                      :store_url, :store_host, cast(:user_id as uuid), :triggered_by,
                      cast(:sheet_ref as jsonb), cast(:sheet_snapshot as jsonb)
                    )
                    returning id
                    """
                ),
                {
                    "store_url": store_url.strip(),
                    "store_host": store_host,
                    "user_id": str(user_id),
                    "triggered_by": triggered_by,
                    "sheet_ref": json.dumps(sheet_ref),
                    "sheet_snapshot": json.dumps(sheet_snapshot),
                },
            )
        ).mappings().one()
    except IntegrityError:
        await db.rollback()
        log.info("demo.provision_job_duplicate", store_host=store_host)
        return None
    await db.commit()
    job_id = UUID(str(row["id"]))
    log.info(
        "demo.provision_job_enqueued",
        job_id=str(job_id),
        store_host=store_host,
        sheet_ref=sheet_ref,
    )
    return job_id


async def requeue_stale_running_jobs(db: AsyncSession) -> int:
    """Return jobs stuck in running (worker crash) back to queued."""
    cutoff = datetime.now(UTC) - timedelta(minutes=_STALE_RUNNING_MINUTES)
    result = await db.execute(
        text(
            """
            update public.demo_provision_jobs
            set status = 'queued',
                progress_pct = 0,
                started_at = null,
                updated_at = now(),
                metrics = coalesce(metrics, '{}'::jsonb) || '{"requeued_stale": true}'::jsonb
            where status = 'running'
              and started_at is not null
              and started_at < :cutoff
            """
        ),
        {"cutoff": cutoff},
    )
    await db.commit()
    return int(result.rowcount or 0)


async def claim_next_demo_provision_job(db: AsyncSession) -> dict[str, Any] | None:
    row = (
        await db.execute(
            text(
                """
                select id, store_url, store_host, user_id, sheet_ref, sheet_snapshot, attempt
                from public.demo_provision_jobs
                where status = 'queued'
                order by created_at asc
                limit 1
                """
            )
        )
    ).mappings().first()
    if row is None:
        return None

    job_id = str(row["id"])
    claim = await db.execute(
        text(
            """
            update public.demo_provision_jobs
            set status = 'running',
                started_at = coalesce(started_at, now()),
                progress_pct = greatest(progress_pct, 5),
                updated_at = now()
            where id = cast(:job_id as uuid) and status = 'queued'
            """
        ),
        {"job_id": job_id},
    )
    await db.commit()
    if (claim.rowcount or 0) == 0:
        return None

    data = dict(row)
    for key in ("sheet_ref", "sheet_snapshot"):
        raw = data.get(key)
        if isinstance(raw, str):
            data[key] = json.loads(raw)
        elif raw is None:
            data[key] = {}
    data["id"] = UUID(job_id)
    data["user_id"] = UUID(str(data["user_id"]))
    return data


async def update_demo_provision_job_progress(
    db: AsyncSession,
    job_id: UUID,
    *,
    progress_pct: int,
    metrics_patch: dict[str, Any] | None = None,
) -> None:
    await db.execute(
        text(
            """
            update public.demo_provision_jobs
            set progress_pct = greatest(progress_pct, :progress_pct),
                metrics = coalesce(metrics, '{}'::jsonb) || cast(:metrics_patch as jsonb),
                updated_at = now()
            where id = cast(:job_id as uuid)
            """
        ),
        {
            "job_id": str(job_id),
            "progress_pct": max(0, min(100, progress_pct)),
            "metrics_patch": json.dumps(metrics_patch or {}),
        },
    )
    await db.commit()


async def complete_demo_provision_job(
    db: AsyncSession,
    job_id: UUID,
    *,
    agent_id: UUID | None,
    result: dict[str, Any],
) -> None:
    await db.execute(
        text(
            """
            update public.demo_provision_jobs
            set status = 'succeeded',
                agent_id = cast(:agent_id as uuid),
                result = cast(:result as jsonb),
                progress_pct = 100,
                finished_at = now(),
                updated_at = now(),
                error_message = null
            where id = cast(:job_id as uuid)
            """
        ),
        {
            "job_id": str(job_id),
            "agent_id": str(agent_id) if agent_id else None,
            "result": json.dumps(result),
        },
    )
    await db.commit()


async def fail_demo_provision_job(
    db: AsyncSession,
    job_id: UUID,
    *,
    error_message: str,
    result: dict[str, Any] | None = None,
) -> None:
    await db.execute(
        text(
            """
            update public.demo_provision_jobs
            set status = 'failed',
                error_message = :error_message,
                result = coalesce(cast(:result as jsonb), result),
                progress_pct = 100,
                finished_at = now(),
                updated_at = now()
            where id = cast(:job_id as uuid)
            """
        ),
        {
            "job_id": str(job_id),
            "error_message": error_message[:2000],
            "result": json.dumps(result or {}),
        },
    )
    await db.commit()
