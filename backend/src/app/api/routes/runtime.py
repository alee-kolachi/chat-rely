from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_current_user, get_db
from app.domains.runtime.schemas import RuntimeChatRequest, RuntimeChatResponse
from app.domains.runtime.service import run_chat

router = APIRouter(prefix="/runtime", tags=["runtime"])


@router.post("/chat", response_model=RuntimeChatResponse)
async def runtime_chat_route(
    payload: RuntimeChatRequest,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RuntimeChatResponse:
    return await run_chat(db, user.user_id, payload)

