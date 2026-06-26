"""Process queued demo provision jobs (one store at a time)."""

from __future__ import annotations

from typing import Any
from uuid import UUID

import structlog

from app.core.settings import get_settings
from app.db.session import get_session_factory
from app.domains.demo.demo_provision_jobs import (
    claim_next_demo_provision_job,
    complete_demo_provision_job,
    fail_demo_provision_job,
    requeue_stale_running_jobs,
    update_demo_provision_job_progress,
)
from app.domains.demo.demo_sheet_writeback import write_sheet_row_result
from app.domains.demo.progress import demo_step
from app.domains.demo.provision import provision_demo_from_store_url

log = structlog.get_logger("demo.provision_runner")


async def process_demo_provision_jobs(*, max_jobs: int | None = None) -> dict[str, int]:
    settings = get_settings()
    limit = max_jobs if max_jobs is not None else settings.demo_provision_max_jobs_per_tick
    stats = {"claimed": 0, "succeeded": 0, "needs_review": 0, "failed": 0}

    async with get_session_factory()() as db:
        requeued = await requeue_stale_running_jobs(db)
        if requeued:
            log.info("demo.provision_jobs_requeued_stale", count=requeued)

    for _ in range(max(0, limit)):
        async with get_session_factory()() as db:
            job = await claim_next_demo_provision_job(db)
        if job is None:
            break

        stats["claimed"] += 1
        job_id: UUID = job["id"]
        store_url = str(job["store_url"])
        sheet_ref = job.get("sheet_ref") or {}
        sheet_snapshot = job.get("sheet_snapshot") or {}

        demo_step(
            "provision.job_start",
            job_id=str(job_id),
            store=store_url,
            tab=sheet_ref.get("tab_name"),
            row=sheet_ref.get("row_index"),
        )

        result: dict[str, Any]
        try:
            async with get_session_factory()() as db:
                await update_demo_provision_job_progress(db, job_id, progress_pct=10)
                result = await provision_demo_from_store_url(
                    db,
                    store_url=store_url,
                    sheet_ref=sheet_ref,
                    sheet_snapshot=sheet_snapshot,
                )
                agent_id_raw = result.get("agent_id")
                agent_id = UUID(str(agent_id_raw)) if agent_id_raw else None
                status = str(result.get("status") or "failed")
                if result.get("ok"):
                    await complete_demo_provision_job(
                        db,
                        job_id,
                        agent_id=agent_id,
                        result=result,
                    )
                else:
                    await fail_demo_provision_job(
                        db,
                        job_id,
                        error_message=str(result.get("reason") or status),
                        result=result,
                    )
        except Exception as exc:
            log.exception(
                "demo.provision_job_failed",
                job_id=str(job_id),
                store_url=store_url,
            )
            result = {
                "ok": False,
                "status": "failed",
                "url": "",
                "reason": "provision_exception",
            }
            async with get_session_factory()() as db:
                await fail_demo_provision_job(
                    db,
                    job_id,
                    error_message=str(exc),
                    result=result,
                )

        status = str(result.get("status") or "failed")
        if status == "ready":
            stats["succeeded"] += 1
        elif status == "needs_review":
            stats["needs_review"] += 1
        else:
            stats["failed"] += 1

        try:
            write_sheet_row_result(sheet_ref=sheet_ref, result=result)
        except Exception:
            log.exception(
                "demo.sheet_writeback_failed",
                job_id=str(job_id),
                sheet_ref=sheet_ref,
            )

        demo_step(
            "provision.job_done",
            job_id=str(job_id),
            status=status,
            url=result.get("url"),
        )
        log.info(
            "demo.provision_job_processed",
            job_id=str(job_id),
            status=status,
            url=result.get("url"),
        )

    return stats
