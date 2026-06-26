"""Poll Google Sheets and run demo outreach provisioning + TTL cleanup."""

from __future__ import annotations

import asyncio
import os

import structlog

from app.core.logging import setup_logging
from app.core.settings import get_settings
from app.db.engine import init_engine
from app.db.session import get_session_factory, init_session_factory
from app.domains.demo.cleanup import expire_due_demos
from app.domains.demo.sheets_sync import sync_demo_sheet_once

log = structlog.get_logger("outreach_worker")

OUTREACH_POLL_INTERVAL_SECONDS = 6 * 60 * 60  # 6 hours


async def run_tick_once() -> dict[str, int]:
    stats = {"expired": 0, "processed": 0}
    async with get_session_factory()() as db:
        stats["expired"] = await expire_due_demos(db)
    try:
        sheet_stats = await sync_demo_sheet_once()
        stats.update(sheet_stats)
    except RuntimeError as exc:
        log.warning("demo.sheets_sync_skipped", reason=str(exc))
    except Exception:
        log.exception("demo.sheets_sync_failed")
    return stats


async def run_loop(interval_seconds: float = OUTREACH_POLL_INTERVAL_SECONDS) -> None:
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
    while True:
        try:
            stats = await run_tick_once()
            if stats.get("processed") or stats.get("expired"):
                log.info("outreach_worker.tick", **stats)
        except Exception:
            log.exception("outreach_worker.tick_failed")
        await asyncio.sleep(interval_seconds)


def main() -> None:
    try:
        asyncio.run(run_loop())
    except KeyboardInterrupt:
        log.info("outreach_worker_stopped_by_user")


if __name__ == "__main__":
    main()
