from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.agents.service import _fetch_agent_by_id
from app.domains.analytics.schemas import (
    AgentAnalyticsResponse,
    AnalyticsNamedCount,
    AnalyticsQualityMetric,
    AnalyticsSentimentSlice,
    AnalyticsSeriesPoint,
)
from app.domains.conversation_outcomes.service import tick_idle_and_outcomes
from app.domains.dashboard.service import resolve_dashboard_range


async def build_agent_analytics(
    db: AsyncSession,
    *,
    user_id: UUID,
    agent_id: UUID,
    range_key: str | None,
    range_from: datetime | None,
    range_to: datetime | None,
    tick_lifecycle: bool = True,
) -> AgentAnalyticsResponse:
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
    escalations_pct: float | None = None
    if conversations_started > 0:
        escalations_pct = round(100.0 * escalated_n / conversations_started, 1)

    outcome_row = await db.execute(
        text(
            """
            select
              count(*)::int as total,
              count(*) filter (
                where (o.payload->>'resolved_by_agent')::boolean is true
              )::int as resolved_n,
              avg((o.payload->>'resolution_confidence')::double precision) as avg_conf
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
    avg_conf = orow["avg_conf"]
    resolved_by_agent_pct: float | None = None
    if outcome_total > 0:
        resolved_by_agent_pct = round(100.0 * resolved_n / outcome_total, 1)

    resolved_no_esc = await db.execute(
        text(
            """
            select count(*)::int as n
            from public.conversation_outcomes o
            join public.conversations c on c.id = o.conversation_id
            where c.user_id = cast(:user_id as uuid)
              and c.agent_id = cast(:agent_id as uuid)
              and c.started_at >= :rf
              and c.started_at < :rt
              and (o.payload->>'resolved_by_agent')::boolean is true
              and c.status <> 'escalated'
            """
        ),
        params,
    )
    resolved_not_escalated_n = int(resolved_no_esc.mappings().one()["n"])

    latency_row = await db.execute(
        text(
            """
            select avg(m.latency_ms)::double precision as avg_ms
            from public.messages m
            join public.conversations c on c.id = m.conversation_id
            where c.user_id = cast(:user_id as uuid)
              and c.agent_id = cast(:agent_id as uuid)
              and c.started_at >= :rf
              and c.started_at < :rt
              and m.role = 'assistant'
              and m.latency_ms is not null
            """
        ),
        params,
    )
    avg_ms_raw = latency_row.mappings().one()["avg_ms"]
    avg_response_time_ms: float | None = None
    if avg_ms_raw is not None:
        avg_response_time_ms = round(float(avg_ms_raw), 1)

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
        AnalyticsSeriesPoint(bucket_date=r["bucket_date"], count=int(r["n"]))
        for r in series_result.mappings().all()
    ]

    intents_result = await db.execute(
        text(
            """
            select
              nullif(trim(o.payload->>'primary_intent_slug'), '') as slug,
              max(nullif(trim(o.payload->>'primary_intent'), '')) as label,
              count(*)::int as n
            from public.conversation_outcomes o
            join public.conversations c on c.id = o.conversation_id
            where c.user_id = cast(:user_id as uuid)
              and c.agent_id = cast(:agent_id as uuid)
              and c.started_at >= :rf
              and c.started_at < :rt
              and length(coalesce(nullif(trim(o.payload->>'primary_intent_slug'), ''), '')) > 0
            group by 1
            order by n desc, slug asc
            limit 10
            """
        ),
        params,
    )
    top_intents = [
        AnalyticsNamedCount(
            key=str(r["slug"] or ""),
            label=str(r["label"] or r["slug"] or "Intent"),
            count=int(r["n"]),
        )
        for r in intents_result.mappings().all()
        if r["slug"]
    ]

    sentiment_result = await db.execute(
        text(
            """
            with last_turn as (
              select distinct on (m.conversation_id)
                m.conversation_id,
                case
                  when (m.metadata->'turn_signals'->>'customer_sentiment') in ('positive') then 'positive'
                  when (m.metadata->'turn_signals'->>'customer_sentiment') in ('negative', 'frustrated')
                    then 'negative'
                  else 'neutral'
                end as bucket
              from public.messages m
              join public.conversations c on c.id = m.conversation_id
              where c.user_id = cast(:user_id as uuid)
                and c.agent_id = cast(:agent_id as uuid)
                and c.started_at >= :rf
                and c.started_at < :rt
                and m.role = 'assistant'
                and m.metadata ? 'turn_signals'
                and m.metadata->'turn_signals'->>'customer_sentiment' is not null
              order by m.conversation_id, m.created_at desc
            )
            select bucket, count(*)::int as n
            from last_turn
            group by bucket
            """
        ),
        params,
    )
    sent_rows = {str(r["bucket"]): int(r["n"]) for r in sentiment_result.mappings().all()}
    pos = sent_rows.get("positive", 0)
    neu = sent_rows.get("neutral", 0)
    neg = sent_rows.get("negative", 0)
    sent_total = pos + neu + neg
    sentiment: list[AnalyticsSentimentSlice] = []
    for bucket, count in (("positive", pos), ("neutral", neu), ("negative", neg)):
        pct = round(100.0 * count / sent_total, 1) if sent_total > 0 else None
        sentiment.append(AnalyticsSentimentSlice(bucket=bucket, count=count, pct=pct))

    countries_result = await db.execute(
        text(
            """
            select
              coalesce(nullif(upper(trim(c.metadata->>'country_code')), ''), 'UNKNOWN') as code,
              count(*)::int as n
            from public.conversations c
            where c.user_id = cast(:user_id as uuid)
              and c.agent_id = cast(:agent_id as uuid)
              and c.started_at >= :rf
              and c.started_at < :rt
            group by 1
            order by n desc, code asc
            limit 12
            """
        ),
        params,
    )
    countries = [
        AnalyticsNamedCount(
            key=str(r["code"] or "UNKNOWN"),
            label="Unknown" if str(r["code"]) == "UNKNOWN" else str(r["code"]),
            count=int(r["n"]),
        )
        for r in countries_result.mappings().all()
    ]

    gap_row = await db.execute(
        text(
            """
            select
              count(*) filter (
                where (m.metadata->'turn_signals'->>'knowledge_gap')::boolean is true
              )::int as gaps,
              count(*)::int as total
            from public.messages m
            join public.conversations c on c.id = m.conversation_id
            where c.user_id = cast(:user_id as uuid)
              and c.agent_id = cast(:agent_id as uuid)
              and c.started_at >= :rf
              and c.started_at < :rt
              and m.role = 'assistant'
              and m.metadata ? 'turn_signals'
            """
        ),
        params,
    )
    grow = gap_row.mappings().one()
    gap_n = int(grow["gaps"] or 0)
    gap_total = int(grow["total"] or 0)
    gap_pct: float | None = None
    if gap_total > 0:
        gap_pct = round(100.0 * gap_n / gap_total, 1)

    fcr_pct: float | None = None
    if outcome_total > 0:
        fcr_pct = round(100.0 * resolved_not_escalated_n / outcome_total, 1)

    avg_conf_pct: str | None = None
    if avg_conf is not None:
        avg_conf_pct = f"{round(float(avg_conf) * 100.0, 1)}%"

    quality: list[AnalyticsQualityMetric] = [
        AnalyticsQualityMetric(
            key="resolution_confidence",
            label="Avg resolution confidence",
            value=avg_conf_pct or "—",
            hint="From end-of-conversation analysis (closed chats in range).",
        ),
        AnalyticsQualityMetric(
            key="resolved_no_escalation",
            label="Resolved without escalation",
            value=f"{fcr_pct}%" if fcr_pct is not None else "—",
            hint="AI marked resolved and conversation was not escalated.",
        ),
        AnalyticsQualityMetric(
            key="knowledge_gap_turns",
            label="Turns flagged knowledge gap",
            value=f"{gap_pct}%" if gap_pct is not None else "—",
            hint="Share of assistant replies with per-turn gap signal.",
        ),
    ]

    return AgentAnalyticsResponse(
        range_from=rf,
        range_to=rt,
        conversations_started=conversations_started,
        resolved_by_agent_pct=resolved_by_agent_pct,
        escalations_pct=escalations_pct,
        avg_response_time_ms=avg_response_time_ms,
        series=series,
        top_intents=top_intents,
        sentiment=sentiment,
        countries=countries,
        quality=quality,
    )
