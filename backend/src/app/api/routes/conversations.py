import asyncio
import logging
import time
from datetime import datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_current_user, get_db
from app.db.session import get_session_factory
from app.core.errors import AppError
from app.domains.conversation_outcomes.service import analyze_and_persist_outcome
from app.domains.conversations.schemas import (
    ConversationDetailResponse,
    ConversationMessageAppendResponse,
    ConversationListResponse,
    ConversationMessageCreateRequest,
    ConversationUpdateRequest,
    ConversationWorkspaceResponse,
    MessageDTO,
    VisitorContactSubmitRequest,
    VisitorContactSubmitResponse,
)
from app.domains.conversation_summaries.schemas import (
    ConversationSummaryDTO,
    ConversationSummaryGenerateRequest,
    ConversationSummaryStateResponse,
)
from app.domains.conversation_summaries.service import (
    generate_conversation_summary,
    get_conversation_summary_state,
)
from app.domains.conversations.service import (
    append_message,
    get_conversation,
    list_conversations,
    list_messages,
    mark_conversation_operator_engaged,
    update_conversation_status,
)
from app.agent.escalation import escalation_handoff_api_fields, submit_visitor_contact_for_escalation
from app.domains.actions.service import get_human_escalation_for_runtime
from app.domains.integrations.mailjet.notify import maybe_send_ticket_email_reply

router = APIRouter(prefix="/conversations", tags=["conversations"])
log = logging.getLogger(__name__)

SseIdleSignal = Literal["push", "heartbeat", "disconnect"]


async def _sse_idle_wait(
    request: Request,
    waiter: asyncio.Event,
    *,
    max_seconds: float = 25.0,
) -> SseIdleSignal:
    """Wait for a workspace push, heartbeat, or client disconnect without long cancel scopes."""
    deadline = time.monotonic() + max_seconds
    while time.monotonic() < deadline:
        if await request.is_disconnected():
            return "disconnect"
        if waiter.is_set():
            waiter.clear()
            return "push"
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            break
        try:
            await asyncio.sleep(min(1.0, remaining))
        except asyncio.CancelledError:
            return "disconnect"
    return "heartbeat"


async def _analyze_outcome_in_background(user_id: UUID, conversation_id: UUID) -> None:
    async with get_session_factory()() as db:
        try:
            await analyze_and_persist_outcome(db, user_id=user_id, conversation_id=conversation_id)
        except Exception as exc:
            log.warning(
                "outcome.background_failed",
                conversation_id=str(conversation_id),
                error=str(exc),
            )


async def _conversation_workspace_response(
    db: AsyncSession,
    *,
    user_id: UUID,
    agent_id: UUID | None,
    status: str | None,
    started_after: datetime | None,
    started_before: datetime | None,
    training_topic: str | None,
    limit: int,
    offset: int,
    detail_conversation_id: UUID | None,
) -> ConversationWorkspaceResponse:
    conversations = await list_conversations(
        db,
        user_id,
        agent_id=agent_id,
        status=status,
        started_after=started_after,
        started_before=started_before,
        training_topic_slug=training_topic,
        limit=limit,
        offset=offset,
    )
    detail: ConversationDetailResponse | None = None
    if detail_conversation_id is not None:
        try:
            conversation = await get_conversation(db, user_id, detail_conversation_id)
            messages = await list_messages(db, user_id, detail_conversation_id)
            detail = ConversationDetailResponse(conversation=conversation, messages=messages)
        except AppError as exc:
            if exc.status_code != 404:
                raise
    return ConversationWorkspaceResponse(conversations=conversations, detail=detail)


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


@router.get("/workspace", response_model=ConversationWorkspaceResponse)
async def conversations_workspace_route(
    agent_id: UUID | None = Query(default=None),
    status: str | None = Query(default=None),
    started_after: datetime | None = Query(default=None),
    started_before: datetime | None = Query(default=None),
    training_topic: str | None = Query(
        default=None, description="Filter by training topic slug from conversation outcomes"
    ),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    detail_conversation_id: UUID | None = Query(default=None),
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationWorkspaceResponse:
    """List conversations and optionally hydrate one thread in a single round-trip."""
    return await _conversation_workspace_response(
        db,
        user_id=user.user_id,
        agent_id=agent_id,
        status=status,
        started_after=started_after,
        started_before=started_before,
        training_topic=training_topic,
        limit=limit,
        offset=offset,
        detail_conversation_id=detail_conversation_id,
    )


@router.get("/workspace/stream")
async def conversations_workspace_stream_route(
    request: Request,
    agent_id: UUID | None = Query(default=None),
    status: str | None = Query(default=None),
    started_after: datetime | None = Query(default=None),
    started_before: datetime | None = Query(default=None),
    training_topic: str | None = Query(
        default=None, description="Filter by training topic slug from conversation outcomes"
    ),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    detail_conversation_id: UUID | None = Query(default=None),
    user: AuthContext = Depends(get_current_user),
) -> StreamingResponse:
    """Long-lived SSE: initial workspace snapshot, then pushes on conversation changes (no DB polling)."""

    from app.domains.conversations.workspace_events import (
        register_workspace_waiter,
        unregister_workspace_waiter,
    )

    user_id = user.user_id

    async def event_gen():
        sf = get_session_factory()
        waiter = register_workspace_waiter(user_id)
        waiter.clear()
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    async with sf() as db:
                        data = await _conversation_workspace_response(
                            db,
                            user_id=user_id,
                            agent_id=agent_id,
                            status=status,
                            started_after=started_after,
                            started_before=started_before,
                            training_topic=training_topic,
                            limit=limit,
                            offset=offset,
                            detail_conversation_id=detail_conversation_id,
                        )
                except asyncio.CancelledError:
                    break
                yield f"data: {data.model_dump_json()}\n\n"
                signal = await _sse_idle_wait(request, waiter)
                if signal == "disconnect":
                    break
                if signal == "heartbeat":
                    yield ": heartbeat\n\n"
        finally:
            unregister_workspace_waiter(user_id, waiter)

    return StreamingResponse(event_gen(), media_type="text/event-stream")


@router.post("/{conversation_id}/visitor-contact", response_model=VisitorContactSubmitResponse)
async def submit_visitor_contact_route(
    conversation_id: UUID,
    payload: VisitorContactSubmitRequest,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VisitorContactSubmitResponse:
    conv = await get_conversation(db, user.user_id, conversation_id)
    if conv.agent_id != payload.agent_id:
        raise AppError(code="conversation.not_found", message="Conversation not found", status_code=404)
    _, esc_cfg = await get_human_escalation_for_runtime(
        db,
        user_id=user.user_id,
        agent_id=payload.agent_id,
    )
    result = await submit_visitor_contact_for_escalation(
        db,
        user_id=user.user_id,
        agent_id=payload.agent_id,
        conversation_id=conversation_id,
        visitor_name=payload.visitor_name,
        visitor_email=payload.visitor_email,
        esc_cfg=esc_cfg,
    )
    handoff = escalation_handoff_api_fields(esc_cfg)
    return VisitorContactSubmitResponse(
        handoff_message=result.reply,
        conversation_status=result.conversation_status,
        contact_capture_required=result.contact_capture_required,
        **handoff,
    )


async def _conversation_detail_response(
    db: AsyncSession,
    *,
    user_id: UUID,
    conversation_id: UUID,
) -> ConversationDetailResponse:
    conversation = await get_conversation(db, user_id, conversation_id)
    messages = await list_messages(db, user_id, conversation_id)
    return ConversationDetailResponse(conversation=conversation, messages=messages)


@router.get("/{conversation_id}/stream")
async def conversation_detail_stream_route(
    conversation_id: UUID,
    request: Request,
    user: AuthContext = Depends(get_current_user),
) -> StreamingResponse:
    """Long-lived SSE: initial thread snapshot, then pushes when messages change (no DB polling)."""

    from app.domains.conversations.workspace_events import (
        register_workspace_waiter,
        unregister_workspace_waiter,
    )

    user_id = user.user_id
    cid = conversation_id

    async def event_gen():
        sf = get_session_factory()
        waiter = register_workspace_waiter(user_id)
        waiter.clear()
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    async with sf() as db:
                        data = await _conversation_detail_response(
                            db, user_id=user_id, conversation_id=cid
                        )
                except AppError:
                    break
                except asyncio.CancelledError:
                    break
                yield f"data: {data.model_dump_json()}\n\n"
                signal = await _sse_idle_wait(request, waiter)
                if signal == "disconnect":
                    break
                if signal == "heartbeat":
                    yield ": heartbeat\n\n"
        finally:
            unregister_workspace_waiter(user_id, waiter)

    return StreamingResponse(event_gen(), media_type="text/event-stream")


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation_route(
    conversation_id: UUID,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationDetailResponse:
    return await _conversation_detail_response(
        db, user_id=user.user_id, conversation_id=conversation_id
    )


@router.get("/{conversation_id}/summary", response_model=ConversationSummaryStateResponse)
async def get_conversation_summary_route(
    conversation_id: UUID,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationSummaryStateResponse:
    return await get_conversation_summary_state(db, user.user_id, conversation_id)


@router.post("/{conversation_id}/summary", response_model=ConversationSummaryDTO)
async def generate_conversation_summary_route(
    conversation_id: UUID,
    payload: ConversationSummaryGenerateRequest,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationSummaryDTO:
    return await generate_conversation_summary(
        db,
        user.user_id,
        conversation_id,
        regenerate=payload.regenerate,
    )


@router.post("/{conversation_id}/messages", response_model=ConversationMessageAppendResponse)
async def append_message_route(
    conversation_id: UUID,
    payload: ConversationMessageCreateRequest,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationMessageAppendResponse:
    msg = await append_message(db, user.user_id, conversation_id, payload)
    if payload.role == "assistant" and (payload.content or "").strip():
        await mark_conversation_operator_engaged(db, user.user_id, conversation_id)
        await maybe_send_ticket_email_reply(
            db,
            user_id=user.user_id,
            conversation_id=conversation_id,
            assistant_content=payload.content.strip(),
        )
    conv = await get_conversation(db, user.user_id, conversation_id)
    from app.domains.conversations.visitor_presence import visitor_email_from_metadata

    meta = conv.metadata if isinstance(conv.metadata, dict) else {}
    return ConversationMessageAppendResponse(
        message=msg,
        visitor_online=conv.visitor_online,
        visitor_email=visitor_email_from_metadata(meta),
    )


@router.patch("/{conversation_id}", response_model=ConversationDetailResponse)
async def update_conversation_route(
    conversation_id: UUID,
    payload: ConversationUpdateRequest,
    background_tasks: BackgroundTasks,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationDetailResponse:
    conversation = await update_conversation_status(db, user.user_id, conversation_id, payload)
    if payload.status in ("idle_closed", "resolved", "escalated"):
        background_tasks.add_task(_analyze_outcome_in_background, user.user_id, conversation_id)
    messages = await list_messages(db, user.user_id, conversation_id)
    return ConversationDetailResponse(conversation=conversation, messages=messages)

