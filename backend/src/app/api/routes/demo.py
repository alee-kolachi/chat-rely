"""Public demo outreach routes."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse

from app.agent.service import stream_chat
from app.agent.streaming import format_sse
from app.api.deps import get_db
from app.core.errors import AppError
from app.core.settings import get_settings
from app.domains.demo.rate_limit import enforce_demo_chat_limits, record_demo_chat_message
from app.domains.demo.schemas import DemoChatRequest, DemoPublicConfigResponse
from app.domains.demo.service import get_demo_public_config, resolve_demo_chat_context
from app.domains.runtime.schemas import RuntimeChatRequest

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/demo", tags=["demo"])


@router.get("/{slug}", response_model=DemoPublicConfigResponse)
async def demo_public_config_route(
    slug: str,
    db: AsyncSession = Depends(get_db),
) -> DemoPublicConfigResponse:
    return await get_demo_public_config(db, slug)


@router.post("/{slug}/stream")
async def demo_public_stream_route(
    slug: str,
    payload: DemoChatRequest,
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    user_id, agent_id = await resolve_demo_chat_context(db, slug)
    await enforce_demo_chat_limits(db, agent_id=agent_id, visitor_id=payload.visitor_id)

    runtime_payload = RuntimeChatRequest(
        agent_id=agent_id,
        message=payload.message,
        conversation_id=payload.conversation_id,
        visitor_id=payload.visitor_id,
        channel="demo",
    )

    async def generate():
        try:
            async for frame in stream_chat(user_id, runtime_payload):
                yield frame.encode("utf-8")
            from app.db.session import get_session_factory

            async with get_session_factory()() as record_db:
                await record_demo_chat_message(
                    record_db,
                    agent_id=agent_id,
                    visitor_id=payload.visitor_id,
                )
        except AppError as exc:
            yield format_sse(
                "error",
                {"code": exc.code, "message": exc.message, "details": exc.details},
            ).encode("utf-8")
        except Exception:
            log.exception("demo.stream_failed")
            details: dict[str, str] | None = None
            if get_settings().app_env == "development":
                details = {"hint": "See server logs for demo.stream_failed"}
            yield format_sse(
                "error",
                {
                    "code": "demo.stream_failed",
                    "message": "Something went wrong. Please try again.",
                    "details": details,
                },
            ).encode("utf-8")

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
