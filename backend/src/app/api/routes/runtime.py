import json

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse

from app.api.deps import AuthContext, get_current_user, get_db
from app.core.errors import AppError
from app.domains.runtime.schemas import RuntimeChatRequest, RuntimeChatResponse
from app.domains.runtime.service import run_chat, run_chat_stream

router = APIRouter(prefix="/runtime", tags=["runtime"])


@router.post("/chat", response_model=RuntimeChatResponse)
async def runtime_chat_route(
    payload: RuntimeChatRequest,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RuntimeChatResponse:
    return await run_chat(db, user.user_id, payload)


@router.post("/chat/stream")
async def runtime_chat_stream_route(
    payload: RuntimeChatRequest,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    async def ndjson_body():
        try:
            async for event in run_chat_stream(db, user.user_id, payload):
                yield (json.dumps(event, default=str) + "\n").encode("utf-8")
        except AppError as exc:
            err: dict[str, object] = {"type": "error", "code": exc.code, "message": exc.message}
            if exc.details is not None:
                err["details"] = exc.details
            yield (json.dumps(err, default=str) + "\n").encode("utf-8")

    return StreamingResponse(ndjson_body(), media_type="application/x-ndjson")

