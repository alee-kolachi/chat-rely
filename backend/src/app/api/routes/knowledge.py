from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_current_user, get_db
from app.domains.knowledge.schemas import (
    IndexJobListResponse,
    KnowledgeSourceCreateRequest,
    KnowledgeSourceListResponse,
    SourceIndexResponse,
)
from app.domains.knowledge.service import (
    create_source,
    get_jobs,
    index_website_source,
    list_sources,
)

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.post("/sources")
async def create_source_route(
    payload: KnowledgeSourceCreateRequest,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    source = await create_source(db, user.user_id, payload)
    return {"source": source.model_dump()}


@router.get("/sources", response_model=KnowledgeSourceListResponse)
async def list_sources_route(
    agent_id: UUID | None = Query(default=None),
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> KnowledgeSourceListResponse:
    sources = await list_sources(db, user.user_id, agent_id=agent_id)
    return KnowledgeSourceListResponse(sources=sources)


@router.post("/sources/{source_id}/index", response_model=SourceIndexResponse)
async def index_source_route(
    source_id: UUID,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SourceIndexResponse:
    source, job = await index_website_source(db, source_id, user.user_id)
    return SourceIndexResponse(source=source, job=job)


@router.get("/sources/{source_id}/indexing-jobs", response_model=IndexJobListResponse)
async def list_indexing_jobs_route(
    source_id: UUID,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IndexJobListResponse:
    jobs = await get_jobs(db, source_id, user.user_id)
    return IndexJobListResponse(jobs=jobs)

