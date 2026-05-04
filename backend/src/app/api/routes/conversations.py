from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_current_user, get_db
from app.domains.conversation_outcomes.service import analyze_and_persist_outcome
from app.domains.conversations.schemas import (
    ConversationDetailResponse,
    ConversationListResponse,
    ConversationMessageCreateRequest,
    ConversationUpdateRequest,
    MessageDTO,
)
from app.domains.conversations.service import (
    append_message,
    get_conversation,
    list_conversations,
    list_messages,
    mark_conversation_operator_engaged,
    update_conversation_status,
)
from app.domains.integrations.mailjet.notify import maybe_send_ticket_email_reply

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=ConversationListResponse)
async def list_conversations_route(
    agent_id: UUID | None = Query(default=None),
    status: str | None = Query(default=None),
    started_after: datetime | None = Query(default=None),
    started_before: datetime | None = Query(default=None),
    training_topic: str | None = Query(
        default=None, description="Filter by training topic slug from conversation outcomes"
    ),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationListResponse:
    conversations = await list_conversations(
        db,
        user.user_id,
        agent_id=agent_id,
        status=status,
        started_after=started_after,
        started_before=started_before,
        training_topic_slug=training_topic,
        limit=limit,
        offset=offset,
    )
    return ConversationListResponse(conversations=conversations)


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation_route(
    conversation_id: UUID,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationDetailResponse:
    conversation = await get_conversation(db, user.user_id, conversation_id)
    messages = await list_messages(db, user.user_id, conversation_id)
    return ConversationDetailResponse(conversation=conversation, messages=messages)


@router.post("/{conversation_id}/messages", response_model=MessageDTO)
async def append_message_route(
    conversation_id: UUID,
    payload: ConversationMessageCreateRequest,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageDTO:
    msg = await append_message(db, user.user_id, conversation_id, payload)
    if payload.role == "assistant" and (payload.content or "").strip():
        await mark_conversation_operator_engaged(db, user.user_id, conversation_id)
        await maybe_send_ticket_email_reply(
            db,
            user_id=user.user_id,
            conversation_id=conversation_id,
            assistant_content=payload.content.strip(),
        )
    return msg


@router.patch("/{conversation_id}", response_model=ConversationDetailResponse)
async def update_conversation_route(
    conversation_id: UUID,
    payload: ConversationUpdateRequest,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationDetailResponse:
    conversation = await update_conversation_status(db, user.user_id, conversation_id, payload)
    if payload.status in ("idle_closed", "resolved", "escalated"):
        await analyze_and_persist_outcome(db, user_id=user.user_id, conversation_id=conversation_id)
    messages = await list_messages(db, user.user_id, conversation_id)
    return ConversationDetailResponse(conversation=conversation, messages=messages)

