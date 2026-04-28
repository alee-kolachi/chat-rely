import json
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.domains.conversations.schemas import (
    ConversationDTO,
    ConversationMessageCreateRequest,
    ConversationUpdateRequest,
    MessageDTO,
)


async def get_conversation(db: AsyncSession, user_id: UUID, conversation_id: UUID) -> ConversationDTO:
    result = await db.execute(
        text(
            """
            select
              id, agent_id, user_id, visitor_id, channel, status, started_at, last_activity_at, closed_at,
              customer_message_count, assistant_message_count, tool_call_count,
              total_input_tokens, total_output_tokens, counts_toward_plan, metadata,
              created_at, updated_at
            from public.conversations
            where id = :conversation_id and user_id = :user_id
            """
        ),
        {"conversation_id": str(conversation_id), "user_id": str(user_id)},
    )
    row = result.mappings().first()
    if row is None:
        raise AppError(code="conversation.not_found", message="Conversation not found", status_code=404)
    return ConversationDTO.model_validate(row)


async def list_conversations(
    db: AsyncSession,
    user_id: UUID,
    agent_id: UUID | None = None,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[ConversationDTO]:
    sql = """
        select
          id, agent_id, user_id, visitor_id, channel, status, started_at, last_activity_at, closed_at,
          customer_message_count, assistant_message_count, tool_call_count,
          total_input_tokens, total_output_tokens, counts_toward_plan, metadata,
          created_at, updated_at
        from public.conversations
        where user_id = :user_id
    """
    params: dict[str, object] = {"user_id": str(user_id), "limit": limit, "offset": offset}
    if agent_id:
        sql += " and agent_id = :agent_id"
        params["agent_id"] = str(agent_id)
    if status:
        sql += " and status = :status"
        params["status"] = status
    sql += " order by last_activity_at desc limit :limit offset :offset"
    result = await db.execute(text(sql), params)
    return [ConversationDTO.model_validate(row) for row in result.mappings().all()]


async def list_messages(db: AsyncSession, user_id: UUID, conversation_id: UUID) -> list[MessageDTO]:
    await get_conversation(db, user_id, conversation_id)
    result = await db.execute(
        text(
            """
            select
              id, conversation_id, agent_id, user_id, role, content, tool_name, tool_call_id,
              tool_call_payload, tool_result_payload, model, input_tokens, output_tokens,
              latency_ms, metadata, created_at
            from public.messages
            where conversation_id = :conversation_id and user_id = :user_id
            order by created_at asc
            """
        ),
        {"conversation_id": str(conversation_id), "user_id": str(user_id)},
    )
    return [MessageDTO.model_validate(row) for row in result.mappings().all()]


async def append_message(
    db: AsyncSession,
    user_id: UUID,
    conversation_id: UUID,
    payload: ConversationMessageCreateRequest,
) -> MessageDTO:
    conversation = await get_conversation(db, user_id, conversation_id)
    result = await db.execute(
        text(
            """
            insert into public.messages (
              conversation_id, agent_id, user_id, role, content, tool_name, tool_call_id,
              tool_call_payload, tool_result_payload, model, input_tokens, output_tokens, latency_ms, metadata
            ) values (
              :conversation_id, :agent_id, :user_id, :role, :content, :tool_name, :tool_call_id,
              CAST(:tool_call_payload AS jsonb), CAST(:tool_result_payload AS jsonb), :model,
              :input_tokens, :output_tokens, :latency_ms, CAST(:metadata AS jsonb)
            )
            returning
              id, conversation_id, agent_id, user_id, role, content, tool_name, tool_call_id,
              tool_call_payload, tool_result_payload, model, input_tokens, output_tokens,
              latency_ms, metadata, created_at
            """
        ),
        {
            "conversation_id": str(conversation_id),
            "agent_id": str(conversation.agent_id),
            "user_id": str(user_id),
            "role": payload.role,
            "content": payload.content,
            "tool_name": payload.tool_name,
            "tool_call_id": payload.tool_call_id,
            "tool_call_payload": json.dumps(payload.tool_call_payload or {}),
            "tool_result_payload": json.dumps(payload.tool_result_payload or {}),
            "model": payload.model,
            "input_tokens": payload.input_tokens,
            "output_tokens": payload.output_tokens,
            "latency_ms": payload.latency_ms,
            "metadata": json.dumps(payload.metadata or {}),
        },
    )
    message = MessageDTO.model_validate(result.mappings().one())

    counter_column = {
        "user": "customer_message_count",
        "assistant": "assistant_message_count",
        "tool": "tool_call_count",
    }.get(payload.role)
    if counter_column:
        await db.execute(
            text(
                f"""
                update public.conversations
                set {counter_column} = {counter_column} + 1,
                    total_input_tokens = total_input_tokens + :input_tokens,
                    total_output_tokens = total_output_tokens + :output_tokens,
                    last_activity_at = now(),
                    updated_at = now()
                where id = :conversation_id and user_id = :user_id
                """
            ),
            {
                "conversation_id": str(conversation_id),
                "user_id": str(user_id),
                "input_tokens": payload.input_tokens,
                "output_tokens": payload.output_tokens,
            },
        )
    await db.commit()
    return message


async def update_conversation_status(
    db: AsyncSession,
    user_id: UUID,
    conversation_id: UUID,
    payload: ConversationUpdateRequest,
) -> ConversationDTO:
    result = await db.execute(
        text(
            """
            update public.conversations
            set status = :status,
                closed_at = case when :status in ('resolved', 'idle_closed') then coalesce(closed_at, now()) else closed_at end,
                updated_at = now()
            where id = :conversation_id and user_id = :user_id
            returning
              id, agent_id, user_id, visitor_id, channel, status, started_at, last_activity_at, closed_at,
              customer_message_count, assistant_message_count, tool_call_count,
              total_input_tokens, total_output_tokens, counts_toward_plan, metadata,
              created_at, updated_at
            """
        ),
        {"status": payload.status, "conversation_id": str(conversation_id), "user_id": str(user_id)},
    )
    row = result.mappings().first()
    if row is None:
        raise AppError(code="conversation.not_found", message="Conversation not found", status_code=404)
    await db.commit()
    return ConversationDTO.model_validate(row)

