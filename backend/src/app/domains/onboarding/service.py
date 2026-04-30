import json
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.domains.agents.schemas import AgentCreateRequest, AgentUpdateRequest
from app.domains.agents.service import create_agent, update_agent
from app.domains.knowledge.schemas import KnowledgeSourceCreateRequest
from app.domains.knowledge.service import enqueue_index_website_source
from app.domains.onboarding.schemas import (
    OnboardingFinishRequest,
    OnboardingPreferencesRequest,
    OnboardingStartRequest,
    OnboardingStartResponse,
    OnboardingStatusResponse,
    OnboardingStepStatusDTO,
    OnboardingWebsiteRequest,
    OnboardingWebsiteResponse,
)

CHECKLIST_DEFAULTS: list[tuple[str, bool]] = [
    ("agent_created", True),
    ("website_connected", True),
    ("pages_indexed", True),
    ("connection_optional", False),
    ("appearance_configured", True),
    ("preview_tested", True),
]


async def _ensure_session(db: AsyncSession, user_id: UUID, agent_id: UUID, current_step: int) -> None:
    await db.execute(
        text(
            """
            insert into public.onboarding_sessions (agent_id, user_id, current_step, progress_pct, status)
            values (:agent_id, :user_id, :current_step, :progress_pct, 'in_progress')
            on conflict (agent_id)
            do update set
              current_step = greatest(public.onboarding_sessions.current_step, excluded.current_step),
              progress_pct = greatest(public.onboarding_sessions.progress_pct, excluded.progress_pct),
              last_seen_at = now()
            """
        ),
        {
            "agent_id": str(agent_id),
            "user_id": str(user_id),
            "current_step": current_step,
            "progress_pct": min(100, max(0, (current_step - 1) * 20)),
        },
    )


async def _seed_checklist(db: AsyncSession, user_id: UUID, agent_id: UUID) -> None:
    for item_key, required in CHECKLIST_DEFAULTS:
        await db.execute(
            text(
                """
                insert into public.onboarding_checklist_items (agent_id, user_id, item_key, required, status)
                values (:agent_id, :user_id, :item_key, :required, 'todo')
                on conflict (agent_id, item_key) do nothing
                """
            ),
            {"agent_id": str(agent_id), "user_id": str(user_id), "item_key": item_key, "required": required},
        )


async def _set_checklist_status(
    db: AsyncSession, user_id: UUID, agent_id: UUID, item_key: str, status: str, evidence: dict[str, object] | None = None
) -> None:
    await db.execute(
        text(
            """
            update public.onboarding_checklist_items
            set status = :status,
                completed_at = case when :status = 'done' then now() else completed_at end,
                evidence = cast(:evidence as jsonb)
            where agent_id = :agent_id and user_id = :user_id and item_key = :item_key
            """
        ),
        {
            "status": status,
            "agent_id": str(agent_id),
            "user_id": str(user_id),
            "item_key": item_key,
            "evidence": json.dumps(evidence or {}),
        },
    )


async def start_onboarding(db: AsyncSession, user_id: UUID, payload: OnboardingStartRequest) -> OnboardingStartResponse:
    agent = await create_agent(db, user_id, AgentCreateRequest(name=payload.name, slug=payload.slug))
    await _ensure_session(db, user_id, agent.id, current_step=1)
    await _seed_checklist(db, user_id, agent.id)
    await _set_checklist_status(db, user_id, agent.id, "agent_created", "done", {"name": payload.name})
    await db.commit()
    return OnboardingStartResponse(agent_id=agent.id, current_step=1)


async def submit_website(
    db: AsyncSession, user_id: UUID, payload: OnboardingWebsiteRequest
) -> OnboardingWebsiteResponse:
    source = await create_source_website(db, user_id, payload)
    _, job = await enqueue_index_website_source(db, source.id, user_id)

    await _ensure_session(db, user_id, payload.agent_id, current_step=2)
    await _set_checklist_status(
        db, user_id, payload.agent_id, "website_connected", "done", {"url": payload.website_url}
    )
    await _set_checklist_status(db, user_id, payload.agent_id, "pages_indexed", "in_progress")

    await db.execute(
        text(
            """
            insert into public.onboarding_preview_assets (
              agent_id, user_id, step_key, asset_type, source_url, capture_status, metadata
            ) values (
              :agent_id, :user_id, 'step_2', 'screenshot', :source_url, 'pending', cast(:metadata as jsonb)
            )
            """
        ),
        {
            "agent_id": str(payload.agent_id),
            "user_id": str(user_id),
            "source_url": payload.website_url,
            "metadata": json.dumps({"title": payload.title}),
        },
    )
    await db.commit()
    return OnboardingWebsiteResponse(source_id=source.id, job_id=job.id, status=job.status)


async def create_source_website(db: AsyncSession, user_id: UUID, payload: OnboardingWebsiteRequest):
    from app.domains.knowledge.service import create_source

    return await create_source(
        db,
        user_id,
        KnowledgeSourceCreateRequest(
            agent_id=payload.agent_id,
            type="website",
            title=payload.title,
            source_url=payload.website_url,
            metadata={"origin": "onboarding"},
        ),
    )


async def save_preferences(db: AsyncSession, user_id: UUID, payload: OnboardingPreferencesRequest) -> None:
    behavior_settings: dict[str, str] = {}
    if payload.tone is not None:
        behavior_settings["tone"] = payload.tone
    if payload.brand_color is not None:
        behavior_settings["brand_color"] = payload.brand_color
    if payload.widget_position is not None:
        behavior_settings["widget_position"] = payload.widget_position

    await update_agent(
        db,
        user_id,
        payload.agent_id,
        AgentUpdateRequest(model=payload.model, behavior_settings=behavior_settings or None),
    )
    await _ensure_session(db, user_id, payload.agent_id, current_step=4)
    await _set_checklist_status(db, user_id, payload.agent_id, "appearance_configured", "done", behavior_settings)
    await db.commit()


async def finish_onboarding(db: AsyncSession, user_id: UUID, payload: OnboardingFinishRequest) -> None:
    await db.execute(
        text(
            """
            update public.onboarding_sessions
            set status = 'completed', current_step = 6, progress_pct = 100, completed_at = now(), last_seen_at = now()
            where agent_id = :agent_id and user_id = :user_id
            """
        ),
        {"agent_id": str(payload.agent_id), "user_id": str(user_id)},
    )
    await _set_checklist_status(db, user_id, payload.agent_id, "preview_tested", "done")
    await db.commit()


async def get_onboarding_status(db: AsyncSession, user_id: UUID, agent_id: UUID) -> OnboardingStatusResponse:
    session_row = (
        await db.execute(
            text(
                """
                select current_step, progress_pct, status
                from public.onboarding_sessions
                where agent_id = :agent_id and user_id = :user_id
                """
            ),
            {"agent_id": str(agent_id), "user_id": str(user_id)},
        )
    ).mappings().first()
    if session_row is None:
        raise AppError(code="onboarding.not_found", message="Onboarding session not found", status_code=404)

    source_row = (
        await db.execute(
            text(
                """
                select id, source_url, title
                from public.knowledge_sources
                where agent_id = :agent_id and user_id = :user_id and type = 'website'
                order by created_at desc
                limit 1
                """
            ),
            {"agent_id": str(agent_id), "user_id": str(user_id)},
        )
    ).mappings().first()

    indexing_job = None
    if source_row:
        indexing_job = (
            await db.execute(
                text(
                    """
                    select status, phase, pages_total, pages_processed, chunks_total, chunks_embedded, progress_pct, error_message
                    from public.indexing_jobs
                    where knowledge_source_id = :source_id and user_id = :user_id
                    order by created_at desc
                    limit 1
                    """
                ),
                {"source_id": str(source_row["id"]), "user_id": str(user_id)},
            )
        ).mappings().first()
        if indexing_job and indexing_job["status"] == "succeeded":
            await _set_checklist_status(db, user_id, agent_id, "pages_indexed", "done")
            await db.commit()

    preview_asset = (
        await db.execute(
            text(
                """
                select source_url, storage_bucket, storage_path, capture_status, metadata
                from public.onboarding_preview_assets
                where agent_id = :agent_id and user_id = :user_id
                order by created_at desc
                limit 1
                """
            ),
            {"agent_id": str(agent_id), "user_id": str(user_id)},
        )
    ).mappings().first()

    checklist_rows = (
        await db.execute(
            text(
                """
                select item_key, status, completed_at, required
                from public.onboarding_checklist_items
                where agent_id = :agent_id and user_id = :user_id
                order by item_key asc
                """
            ),
            {"agent_id": str(agent_id), "user_id": str(user_id)},
        )
    ).mappings().all()

    checklist = [
        OnboardingStepStatusDTO(
            key=str(row["item_key"]),
            status=str(row["status"]),
            completed_at=row["completed_at"],
            required=bool(row["required"]),
        )
        for row in checklist_rows
    ]
    website_url = str(source_row["source_url"]) if source_row else None
    website_title = str(source_row["title"]) if source_row else None
    return OnboardingStatusResponse(
        agent_id=agent_id,
        current_step=int(session_row["current_step"]),
        progress_pct=int(session_row["progress_pct"]),
        session_status=str(session_row["status"]),
        website_url=website_url,
        website_title=website_title,
        preview_asset=dict(preview_asset) if preview_asset else None,
        indexing_job=dict(indexing_job) if indexing_job else None,
        checklist=checklist,
    )
