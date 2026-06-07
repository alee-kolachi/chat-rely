from __future__ import annotations

import json
import re
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.domains.conversations.service import get_conversation, try_mark_conversation_counts_toward_plan
from app.domains.notifications.links import href_escalation
from app.domains.notifications.service import create_notification_best_effort
from app.domains.conversations.visitor_presence import presence_fields_from_row
from app.domains.tickets.schemas import TicketDTO


def _subject_from_user_message(msg: str, *, max_len: int = 120) -> str:
    s = re.sub(r"\s+", " ", (msg or "").strip())
    if not s:
        return "Support request"
    return s[:max_len] + ("…" if len(s) > max_len else "")


async def record_escalation(
    db: AsyncSession,
    *,
    user_id: UUID,
    agent_id: UUID,
    conversation_id: UUID,
    user_message: str,
    customer_email: str | None,
    customer_name: str | None = None,
) -> TicketDTO:
    """Set conversation to escalated and upsert a ticket row."""
    subject = _subject_from_user_message(user_message)
    await db.execute(
        text(
            """
            update public.conversations
            set status = 'escalated',
                updated_at = now()
            where id = :conversation_id and user_id = :user_id and agent_id = :agent_id
            """
        ),
        {
            "conversation_id": str(conversation_id),
            "user_id": str(user_id),
            "agent_id": str(agent_id),
        },
    )
    await try_mark_conversation_counts_toward_plan(db, conversation_id)

    name = (customer_name or "").strip() or None
    ticket_meta = json.dumps({"customer_name": name}) if name else "{}"

    result = await db.execute(
        text(
            """
            insert into public.tickets (
              user_id, agent_id, conversation_id, status, subject, priority, customer_email, metadata
            ) values (
              :user_id, :agent_id, :conversation_id, 'open', :subject, 'medium', :customer_email,
              cast(:ticket_meta as jsonb)
            )
            on conflict (conversation_id) do update
              set status = 'open',
                  subject = excluded.subject,
                  customer_email = coalesce(excluded.customer_email, tickets.customer_email),
                  metadata = case
                    when excluded.metadata ? 'customer_name'
                      then coalesce(tickets.metadata, '{}'::jsonb) || excluded.metadata
                    else tickets.metadata
                  end,
                  updated_at = now()
            returning
              id, user_id, agent_id, conversation_id, status, subject, priority,
              customer_email, external_provider, external_id, metadata, created_at, updated_at
            """
        ),
        {
            "user_id": str(user_id),
            "agent_id": str(agent_id),
            "conversation_id": str(conversation_id),
            "subject": subject,
            "customer_email": customer_email,
            "ticket_meta": ticket_meta,
        },
    )
    row = result.mappings().first()
    await db.commit()
    if row is None:
        raise AppError(code="ticket.persist_failed", message="Could not create ticket", status_code=500)
    await create_notification_best_effort(
        db,
        user_id=user_id,
        kind="escalation",
        title="Conversation escalated",
        body=f"A visitor requested human help: {subject}",
        href=href_escalation(conversation_id=conversation_id, agent_id=agent_id),
        metadata={
            "conversation_id": str(conversation_id),
            "agent_id": str(agent_id),
            "ticket_id": str(row["id"]),
        },
    )
    return TicketDTO.model_validate(row)


async def update_visitor_contact_metadata(
    db: AsyncSession,
    *,
    user_id: UUID,
    conversation_id: UUID,
    visitor_name: str | None,
    visitor_email: str | None,
) -> None:
    patch: dict[str, str] = {}
    name = (visitor_name or "").strip()
    email = (visitor_email or "").strip()
    if name:
        patch["visitor_name"] = name
    if email:
        patch["visitor_email"] = email
    if not patch:
        return
    await db.execute(
        text(
            """
            update public.conversations
            set metadata = coalesce(metadata, '{}'::jsonb) || cast(:patch as jsonb),
                updated_at = now()
            where id = :conversation_id and user_id = :user_id
            """
        ),
        {
            "conversation_id": str(conversation_id),
            "user_id": str(user_id),
            "patch": json.dumps(patch),
        },
    )
    await db.commit()


async def update_visitor_email_metadata(
    db: AsyncSession,
    *,
    user_id: UUID,
    conversation_id: UUID,
    visitor_email: str | None,
) -> None:
    await update_visitor_contact_metadata(
        db,
        user_id=user_id,
        conversation_id=conversation_id,
        visitor_name=None,
        visitor_email=visitor_email,
    )


async def sync_ticket_visitor_contact(
    db: AsyncSession,
    *,
    user_id: UUID,
    conversation_id: UUID,
    customer_name: str | None,
    customer_email: str | None,
) -> None:
    name = (customer_name or "").strip() or None
    email = (customer_email or "").strip() or None
    if not name and not email:
        return
    patch: dict[str, str] = {}
    if name:
        patch["customer_name"] = name
    await db.execute(
        text(
            """
            update public.tickets
            set customer_email = coalesce(:customer_email, customer_email),
                metadata = case
                  when cast(:patch as jsonb) = '{}'::jsonb then metadata
                  else coalesce(metadata, '{}'::jsonb) || cast(:patch as jsonb)
                end,
                updated_at = now()
            where conversation_id = :conversation_id and user_id = :user_id
            """
        ),
        {
            "conversation_id": str(conversation_id),
            "user_id": str(user_id),
            "customer_email": email,
            "patch": json.dumps(patch),
        },
    )
    await db.commit()


async def list_tickets(
    db: AsyncSession,
    *,
    user_id: UUID,
    agent_id: UUID | None = None,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[TicketDTO], int]:
    sql_count = "select count(*)::int as n from public.tickets where user_id = :user_id"
    sql_select = """
        select
          t.id, t.user_id, t.agent_id, t.conversation_id, t.status, t.subject, t.priority,
          t.customer_email, t.external_provider, t.external_id, t.metadata, t.created_at, t.updated_at,
          c.status::text as conversation_status,
          c.metadata as conversation_metadata
        from public.tickets t
        join public.conversations c on c.id = t.conversation_id and c.user_id = t.user_id
        where t.user_id = :user_id
    """
    params: dict[str, Any] = {"user_id": str(user_id), "limit": limit, "offset": offset}
    count_params: dict[str, Any] = {"user_id": str(user_id)}
    if agent_id:
        sql_count += " and agent_id = :agent_id"
        sql_select += " and agent_id = :agent_id"
        params["agent_id"] = str(agent_id)
        count_params["agent_id"] = str(agent_id)
    if status:
        sql_count += " and status = :status"
        sql_select += " and status = :status"
        params["status"] = status
        count_params["status"] = status
    sql_select += " order by updated_at desc limit :limit offset :offset"

    cr = await db.execute(text(sql_count), count_params)
    total = int(cr.mappings().one()["n"])

    result = await db.execute(text(sql_select), params)
    rows = result.mappings().all()
    items: list[TicketDTO] = []
    for row in rows:
        data = dict(row)
        conv_status = data.pop("conversation_status", None)
        conv_meta = data.pop("conversation_metadata", None)
        presence = presence_fields_from_row(status=conv_status, metadata=conv_meta)
        data["conversation_status"] = conv_status
        data["conversation_active"] = presence["conversation_active"]
        data["visitor_online"] = presence["visitor_online"]
        items.append(TicketDTO.model_validate(data))
    return items, total


async def get_ticket(
    db: AsyncSession, user_id: UUID, ticket_id: UUID
) -> TicketDTO:
    result = await db.execute(
        text(
            """
            select
              id, user_id, agent_id, conversation_id, status, subject, priority,
              customer_email, external_provider, external_id, metadata, created_at, updated_at
            from public.tickets
            where id = :ticket_id and user_id = :user_id
            """
        ),
        {"ticket_id": str(ticket_id), "user_id": str(user_id)},
    )
    row = result.mappings().first()
    if row is None:
        raise AppError(code="ticket.not_found", message="Ticket not found", status_code=404)
    return TicketDTO.model_validate(row)


async def sync_ticket_status_after_message(
    db: AsyncSession,
    *,
    user_id: UUID,
    conversation_id: UUID,
    message_role: str,
) -> None:
    """pending_customer when the team replied on an escalated thread; back to open when customer writes."""
    ticket = await get_ticket_by_conversation(db, user_id, conversation_id)
    if ticket is None:
        return
    if message_role == "user":
        if ticket.status == "pending_customer":
            await db.execute(
                text(
                    """
                    update public.tickets
                    set status = 'open',
                        updated_at = now()
                    where id = :ticket_id and user_id = :user_id
                    """
                ),
                {"ticket_id": str(ticket.id), "user_id": str(user_id)},
            )
            await db.commit()
        return
    if message_role != "assistant":
        return
    conv = await get_conversation(db, user_id, conversation_id)
    if conv.status != "escalated":
        return
    if ticket.status == "open":
        await db.execute(
            text(
                """
                update public.tickets
                set status = 'pending_customer',
                    updated_at = now()
                where id = :ticket_id and user_id = :user_id
                """
            ),
            {"ticket_id": str(ticket.id), "user_id": str(user_id)},
        )
        await db.commit()
        return


async def get_ticket_by_conversation(
    db: AsyncSession, user_id: UUID, conversation_id: UUID
) -> TicketDTO | None:
    result = await db.execute(
        text(
            """
            select
              id, user_id, agent_id, conversation_id, status, subject, priority,
              customer_email, external_provider, external_id, metadata, created_at, updated_at
            from public.tickets
            where conversation_id = :conversation_id and user_id = :user_id
            """
        ),
        {"conversation_id": str(conversation_id), "user_id": str(user_id)},
    )
    row = result.mappings().first()
    return TicketDTO.model_validate(row) if row else None
