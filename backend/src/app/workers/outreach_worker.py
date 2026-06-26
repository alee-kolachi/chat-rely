"""Poll Google Sheets and run demo outreach provisioning + TTL cleanup."""

from __future__ import annotations

import argparse
import asyncio
import os

import structlog

from app.core.logging import setup_logging
from app.core.settings import get_settings
from app.db.engine import init_engine
from app.db.session import get_session_factory, init_session_factory
from app.domains.demo.cleanup import expire_due_demos
from app.domains.demo.demo_provision_runner import process_demo_provision_jobs
from app.domains.demo.progress import demo_step
from app.domains.demo.sheets_sync import sync_demo_sheet_once

log = structlog.get_logger("outreach_worker")


def _init_worker() -> float:
    os.environ.setdefault("SUPABASE_JWKS_URL", "https://example.com/.well-known/jwks.json")
    os.environ.setdefault("SUPABASE_ISSUER", "https://example.com/auth/v1")
    settings = get_settings()
    setup_logging(
        settings.log_level,
        log_file_enabled=settings.log_file_enabled,
        log_file_path=settings.log_file_path,
        log_file_max_bytes=settings.log_file_max_bytes,
        log_file_backup_count=settings.log_file_backup_count,
        log_pretty_file_enabled=settings.log_pretty_file_enabled,
        log_pretty_file_path=settings.log_pretty_file_path,
        log_pretty_file_max_bytes=settings.log_pretty_file_max_bytes,
        log_pretty_file_backup_count=settings.log_pretty_file_backup_count,
    )
    init_engine(settings)
    init_session_factory()
    return float(settings.outreach_poll_interval_seconds)


async def run_tick_once() -> dict[str, int]:
    stats: dict[str, int] = {"expired": 0, "enqueued": 0, "skipped": 0, "already_active": 0}
    async with get_session_factory()() as db:
        stats["expired"] = await expire_due_demos(db)
    try:
        sheet_stats = await sync_demo_sheet_once()
        stats.update(sheet_stats)
    except RuntimeError as exc:
        log.warning("demo.sheets_sync_skipped", reason=str(exc))
    except Exception:
        log.exception("demo.sheets_sync_failed")
    try:
        provision_stats = await process_demo_provision_jobs()
        stats.update(provision_stats)
    except Exception:
        log.exception("demo.provision_jobs_failed")
    return stats


async def _tick_and_log() -> dict[str, int]:
    demo_step("worker.tick_start")
    stats = await run_tick_once()
    demo_step(
        "worker.tick_done",
        enqueued=stats.get("enqueued", 0),
        already_active=stats.get("already_active", 0),
        claimed=stats.get("claimed", 0),
        needs_review=stats.get("needs_review", 0),
        failed=stats.get("failed", 0),
        skipped=stats.get("skipped", 0),
        expired=stats.get("expired", 0),
    )
    log.info("outreach_worker.tick", **stats)
    return stats


async def run_loop(interval_seconds: float) -> None:
    while True:
        try:
            await _tick_and_log()
        except Exception:
            log.exception("outreach_worker.tick_failed")
        await asyncio.sleep(interval_seconds)


def main() -> None:
    parser = argparse.ArgumentParser(description="Demo outreach: Google Sheets sync + provisioning")
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run one sheet sync tick and exit (use after setting Eligible for Demo to Yes)",
    )
    args = parser.parse_args()
    try:
        interval = _init_worker()
        if args.once:
            asyncio.run(_tick_and_log())
        else:
            asyncio.run(run_loop(interval))
    except KeyboardInterrupt:
        log.info("outreach_worker_stopped_by_user")


if __name__ == "__main__":
    main()
