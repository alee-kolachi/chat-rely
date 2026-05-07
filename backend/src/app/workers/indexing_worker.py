import asyncio
import os
from uuid import UUID

import structlog
from sqlalchemy import text

from app.core.settings import get_settings
from app.db.engine import init_engine
from app.db.session import get_session_factory, init_session_factory
from app.domains.knowledge.service import process_indexing_job, record_worker_indexing_surrogate_failure

log = structlog.get_logger("indexing_worker")


async def _fetch_next_job_id() -> tuple[UUID, UUID] | None:
    async with get_session_factory()() as db:
        row = (
            await db.execute(
                text(
                    """
                    select id, user_id
                    from public.indexing_jobs
                    where status = 'queued'
                    order by created_at asc
                    limit 1
                    """
                )
            )
        ).mappings().first()
        if row is None:
            return None

        await db.execute(
            text(
                """
                update public.indexing_jobs
                set status = 'running',
                    phase = case
                      when phase::text = 'embedding_queued' then 'embedding'::public.indexing_job_phase
                      else 'crawling'::public.indexing_job_phase
                    end,
                    progress_pct = case
                      when phase::text = 'embedding_queued' then greatest(progress_pct, 26)
                      else greatest(progress_pct, 5)
                    end,
                    started_at = coalesce(started_at, now())
                where id = :job_id and status = 'queued'
                """
            ),
            {"job_id": str(row["id"])},
        )
        await db.commit()
        return UUID(str(row["id"])), UUID(str(row["user_id"]))


async def _persist_surrogate_safe(job_id: UUID, user_id: UUID, exc: BaseException) -> None:
    try:
        async with get_session_factory()() as db:
            await record_worker_indexing_surrogate_failure(db, job_id, user_id, exc)
    except Exception:
        log.exception(
            "indexing_job_surrogate_persist_failed",
            job_id=str(job_id),
            user_id=str(user_id),
        )


async def run_worker_loop(poll_interval_seconds: float = 2.0) -> None:
    # Worker only needs DB/OpenAI config; provide dev-safe auth defaults
    # so missing auth env vars do not block local worker startup.
    os.environ.setdefault("SUPABASE_JWKS_URL", "https://example.com/.well-known/jwks.json")
    os.environ.setdefault("SUPABASE_ISSUER", "https://example.com/auth/v1")
    settings = get_settings()
    init_engine(settings)
    init_session_factory()
    while True:
        fetched = await _fetch_next_job_id()
        if fetched is None:
            await asyncio.sleep(poll_interval_seconds)
            continue
        job_id, user_id = fetched
        try:
            async with get_session_factory()() as db:
                await process_indexing_job(db, job_id=job_id, user_id=user_id)
        except asyncio.CancelledError:
            # Ctrl+C / task cancellation during httpx or awaits — not a subclass of Exception,
            # so mark the job failed or it stays `running` forever.
            log.warning(
                "indexing_job_cancelled",
                job_id=str(job_id),
                user_id=str(user_id),
            )
            await _persist_surrogate_safe(
                job_id,
                user_id,
                RuntimeError("Indexing interrupted (worker cancelled during I/O)"),
            )
            raise
        except Exception as exc:
            log.exception(
                "indexing_job_failed",
                job_id=str(job_id),
                user_id=str(user_id),
                error=str(exc),
            )
            await _persist_surrogate_safe(job_id, user_id, exc)


def main() -> None:
    try:
        asyncio.run(run_worker_loop())
    except KeyboardInterrupt:
        log.info("indexing_worker_stopped_by_user")


if __name__ == "__main__":
    main()
