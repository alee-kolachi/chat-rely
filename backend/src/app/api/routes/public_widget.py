import json
from typing import Annotated

from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse

from app.api.deps import get_db
from app.core.errors import AppError
from app.domains.public_widget.schemas import (
    PublicWidgetAgentContext,
    PublicWidgetChatRequest,
    PublicWidgetConfigResponse,
)
from app.domains.public_widget.service import (
    build_public_widget_config_response,
    resolve_agent_for_widget_key,
)
from app.domains.runtime.schemas import RuntimeChatRequest
from app.domains.runtime.service import run_chat_stream

router = APIRouter(prefix="/public/widget", tags=["public-widget"])


async def _widget_agent_context(
    x_chatrely_agent_key: str | None = Header(default=None, alias="X-ChatRely-Agent-Key"),
    db: AsyncSession = Depends(get_db),
) -> PublicWidgetAgentContext:
    if x_chatrely_agent_key is None or not str(x_chatrely_agent_key).strip():
        raise AppError(
            code="widget.missing_key",
            message="Missing X-ChatRely-Agent-Key header",
            status_code=401,
        )
    return await resolve_agent_for_widget_key(db, x_chatrely_agent_key)


WidgetAgentDep = Annotated[PublicWidgetAgentContext, Depends(_widget_agent_context)]


@router.get("/config", response_model=PublicWidgetConfigResponse)
async def public_widget_config_route(
    ctx: WidgetAgentDep,
    db: AsyncSession = Depends(get_db),
) -> PublicWidgetConfigResponse:
    return await build_public_widget_config_response(db, ctx)


@router.post("/chat/stream")
async def public_widget_chat_stream_route(
    ctx: WidgetAgentDep,
    payload: PublicWidgetChatRequest,
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    runtime_payload = RuntimeChatRequest(
        agent_id=ctx.agent_id,
        message=payload.message,
        conversation_id=payload.conversation_id,
        visitor_id=payload.visitor_id,
        visitor_email=payload.visitor_email,
        request_human=payload.request_human,
        locale=payload.locale,
        country_code=payload.country_code,
    )

    async def ndjson_body():
        try:
            async for event in run_chat_stream(db, ctx.user_id, runtime_payload):
                yield (json.dumps(event, default=str) + "\n").encode("utf-8")
        except AppError as exc:
            err: dict[str, object] = {"type": "error", "code": exc.code, "message": exc.message}
            if exc.details is not None:
                err["details"] = exc.details
            yield (json.dumps(err, default=str) + "\n").encode("utf-8")

    return StreamingResponse(ndjson_body(), media_type="application/x-ndjson")
