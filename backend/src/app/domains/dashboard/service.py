from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.agents.service import _fetch_agent_by_id
from app.domains.conversation_outcomes.service import tick_idle_and_outcomes
from app.domains.dashboard.schemas import (
    AgentDashboardResponse,
    DashboardRecentRow,
    DashboardSeriesPoint,
    TrainingTopicSummary,
)


def _utc_now() -> datetime:
    return datetime.now(UTC)


def resolve_dashboard_range(
    *,
    range_key: str | None,
    range_from: datetime | None,
    range_to: datetime | None,
) -> tuple[datetime, datetime]:
    now = _utc_now()
    if range_from is not None and range_to is not None:
        return range_from, range_to
    presets = {
        "7d": timedelta(days=7),
        "30d": timedelta(days=30),
        "90d": timedelta(days=90),
        "365d": timedelta(days=365),
    }
    default_delta = presets["30d"]
    key = (range_key or "30d").strip().lower()
    delta = presets.get(key, default_delta)
    start = now - delta
    return start, now


async def build_agent_dashboard(
    db: AsyncSession,
    *,
    user_id: UUID,
    agent_id: UUID,
    range_key: str | None,
    range_from: datetime | None,
    range_to: datetime | None,
    tick_lifecycle: bool = True,
) -> AgentDashboardResponse:
    await _fetch_agent_by_id(db, user_id, agent_id)
    rf, rt = resolve_dashboard_range(
        range_key=range_key, range_from=range_from, range_to=range_to
    )

    if tick_lifecycle:
        await tick_idle_and_outcomes(db)

    agent_s = str(agent_id)
    user_s = str(user_id)
    params: dict[str, object] = {
        "agent_id": agent_s,
        "user_id": user_s,
        "rf": rf,
        "rt": rt,
    }

    started = await db.execute(
        text(
            """
            select count(*)::int as n
            from public.conversations c
            where c.user_id = cast(:user_id as uuid)
              and c.agent_id = cast(:agent_id as uuid)
              and c.started_at >= :rf
              and c.started_at < :rt
            """
        ),
        params,
    )
    conversations_started = int(started.mappings().one()["n"])

    billable = await db.execute(
        text(
            """
            select count(*)::int as n
            from public.conversations c
            where c.user_id = cast(:user_id as uuid)
              and c.agent_id = cast(:agent_id as uuid)
              and c.started_at >= :rf
              and c.started_at < :rt
              and c.counts_toward_plan = true
            """
        ),
        params,
    )
    billable_conversations = int(billable.mappings().one()["n"])

    escalated = await db.execute(
        text(
            """
            select count(*)::int as n
            from public.conversations c
            where c.user_id = cast(:user_id as uuid)
              and c.agent_id = cast(:agent_id as uuid)
              and c.started_at >= :rf
              and c.started_at < :rt
              and c.status = 'escalated'
            """
        ),
        params,
    )
    escalated_n = int(escalated.mappings().one()["n"])

    needs_human_pct: float | None = None
    if conversations_started > 0:
        needs_human_pct = round(100.0 * escalated_n / conversations_started, 1)

    outcome_row = await db.execute(
        text(
            """
            select
              count(*)::int as total,
              count(*) filter (
                where (o.payload->>'resolved_by_agent')::boolean is true
              )::int as resolved_n
            from public.conversation_outcomes o
            join public.conversations c on c.id = o.conversation_id
            where c.user_id = cast(:user_id as uuid)
              and c.agent_id = cast(:agent_id as uuid)
              and c.started_at >= :rf
              and c.started_at < :rt
            """
        ),
        params,
    )
    orow = outcome_row.mappings().one()
    outcome_total = int(orow["total"])
    resolved_n = int(orow["resolved_n"])
    resolved_by_agent_pct: float | None = None
    if outcome_total > 0:
        resolved_by_agent_pct = round(100.0 * resolved_n / outcome_total, 1)

    series_result = await db.execute(
        text(
            """
            select
              (c.started_at at time zone 'utc')::date as bucket_date,
              count(*)::int as n
            from public.conversations c
            where c.user_id = cast(:user_id as uuid)
              and c.agent_id = cast(:agent_id as uuid)
              and c.started_at >= :rf
              and c.started_at < :rt
            group by 1
            order by 1 asc
            """
        ),
        params,
    )
    series = [
        DashboardSeriesPoint(bucket_date=r["bucket_date"], count=int(r["n"]))
        for r in series_result.mappings().all()
    ]

    recent_result = await db.execute(
        text(
            """
            select
              c.id,
              c.visitor_id,
              c.status,
              c.last_activity_at,
              (
                select left(m.content, 200)
                from public.messages m
                where m.conversation_id = c.id and m.user_id = c.user_id
                order by m.created_at desc
                limit 1
              ) as topic_preview
            from public.conversations c
            where c.user_id = cast(:user_id as uuid)
              and c.agent_id = cast(:agent_id as uuid)
            order by c.last_activity_at desc
            limit 8
            """
        ),
        {"user_id": user_s, "agent_id": agent_s},
    )
    recent = [
        DashboardRecentRow(
            conversation_id=r["id"],
            visitor_id=str(r["visitor_id"]),
            topic_preview=r["topic_preview"],
            status=r["status"],
            last_activity_at=r["last_activity_at"],
        )
        for r in recent_result.mappings().all()
    ]

    topics_result = await db.execute(
        text(
            """
            select
              elem->>'slug' as slug,
              max(elem->>'label') as label,
              count(*)::int as n
            from public.conversation_outcomes o
            join public.conversations c on c.id = o.conversation_id
            cross join lateral jsonb_array_elements(coalesce(o.payload->'training_topics', '[]'::jsonb)) elem
            where c.user_id = cast(:user_id as uuid)
              and c.agent_id = cast(:agent_id as uuid)
              and c.started_at >= :rf
              and c.started_at < :rt
              and coalesce((o.payload->>'needs_follow_up_training')::boolean, false) is true
            group by elem->>'slug'
            having count(*) >= 1
            order by n desc, slug asc
            limit 10
            """
        ),
        params,
    )
    training_topics = [
        TrainingTopicSummary(
            slug=str(r["slug"] or ""),
            label=str(r["label"] or r["slug"] or "Topic"),
            count=int(r["n"]),
        )
        for r in topics_result.mappings().all()
        if r["slug"]
    ]

    if not training_topics:
        topics_fallback = await db.execute(
            text(
                """
                select
                  elem->>'slug' as slug,
                  max(elem->>'label') as label,
                  count(*)::int as n
                from public.conversation_outcomes o
                join public.conversations c on c.id = o.conversation_id
                cross join lateral jsonb_array_elements(coalesce(o.payload->'training_topics', '[]'::jsonb)) elem
                where c.user_id = cast(:user_id as uuid)
                  and c.agent_id = cast(:agent_id as uuid)
                  and c.started_at >= :rf
                  and c.started_at < :rt
                group by elem->>'slug'
                having count(*) >= 1
                order by n desc, slug asc
                limit 10
                """
            ),
            params,
        )
        training_topics = [
            TrainingTopicSummary(
                slug=str(r["slug"] or ""),
                label=str(r["label"] or r["slug"] or "Topic"),
                count=int(r["n"]),
            )
            for r in topics_fallback.mappings().all()
            if r["slug"]
        ]

    tick_open = await db.execute(
        text(
            """
            select count(*)::int as n
            from public.tickets t
            where t.user_id = cast(:user_id as uuid)
              and t.agent_id = cast(:agent_id as uuid)
              and t.status = 'open'
            """
        ),
        {"user_id": user_s, "agent_id": agent_s},
    )
    open_escalations = int(tick_open.mappings().one()["n"])

    pend = await db.execute(
        text(
            """
            select count(*)::int as n
            from public.tickets t
            where t.user_id = cast(:user_id as uuid)
              and t.agent_id = cast(:agent_id as uuid)
              and t.status = 'pending_customer'
            """
        ),
        {"user_id": user_s, "agent_id": agent_s},
    )
    awaiting_customer = int(pend.mappings().one()["n"])

    return AgentDashboardResponse(
        range_from=rf,
        range_to=rt,
        conversations_started=conversations_started,
        billable_conversations=billable_conversations,
        resolved_by_agent_pct=resolved_by_agent_pct,
        needs_human_pct=needs_human_pct,
        open_escalations=open_escalations,
        awaiting_customer_reply=awaiting_customer,
        series=series,
        recent=recent,
        training_topics=training_topics,
    )
