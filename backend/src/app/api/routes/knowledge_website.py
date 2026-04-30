from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_current_user, get_db
from app.domains.knowledge.schemas import (
    IndexJobListResponse,
    WebsiteCrawlRequest,
    WebsiteIndividualRequest,
    WebsiteIngestResponse,
    WebsiteSourcePageItemDTO,
    WebsiteSourcePagesResponse,
    WebsiteSitemapRequest,
    WebsiteSourcesListResponse,
    WebsiteUsageResponse,
)
from app.domains.knowledge.service import (
    create_and_enqueue_dashboard_website,
    delete_website_source,
    get_agent_website_usage,
    get_jobs,
    list_website_source_pages,
    list_website_sources_for_agent,
)

router = APIRouter(prefix="/knowledge/website", tags=["knowledge-website"])


@router.post("/crawl", response_model=WebsiteIngestResponse)
async def website_crawl_route(
    payload: WebsiteCrawlRequest,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WebsiteIngestResponse:
    source, job = await create_and_enqueue_dashboard_website(
        db,
        user.user_id,
        payload,
        mode="crawl",
    )
    return WebsiteIngestResponse(source=source, job=job)


@router.post("/sitemap", response_model=WebsiteIngestResponse)
async def website_sitemap_route(
    payload: WebsiteSitemapRequest,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WebsiteIngestResponse:
    source, job = await create_and_enqueue_dashboard_website(
        db,
        user.user_id,
        payload,
        mode="sitemap",
    )
    return WebsiteIngestResponse(source=source, job=job)


@router.post("/links", response_model=WebsiteIngestResponse)
async def website_individual_route(
    payload: WebsiteIndividualRequest,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WebsiteIngestResponse:
    source, job = await create_and_enqueue_dashboard_website(
        db,
        user.user_id,
        payload,
        mode="individual",
    )
    return WebsiteIngestResponse(source=source, job=job)


@router.get("/sources", response_model=WebsiteSourcesListResponse)
async def website_sources_route(
    agent_id: UUID = Query(...),
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WebsiteSourcesListResponse:
    sources = await list_website_sources_for_agent(db, user.user_id, agent_id)
    return WebsiteSourcesListResponse(sources=sources)


@router.get("/sources/{source_id}/pages", response_model=WebsiteSourcePagesResponse)
async def website_source_pages_route(
    source_id: UUID,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
) -> WebsiteSourcePagesResponse:
    rows, total = await list_website_source_pages(db, user.user_id, source_id, offset=offset, limit=limit)
    pages = [
        WebsiteSourcePageItemDTO(
            url=str(r["url"]),
            status=str(r["status"]),
            depth=int(r["depth"]),
            last_indexed_at=r.get("last_indexed_at"),
            http_status=int(r["http_status"]) if r.get("http_status") is not None else None,
        )
        for r in rows
    ]
    return WebsiteSourcePagesResponse(pages=pages, total=total, offset=offset, limit=limit)


@router.delete("/sources/{source_id}", status_code=204)
async def website_source_delete_route(
    source_id: UUID,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await delete_website_source(db, user.user_id, source_id)
    return Response(status_code=204)


@router.get("/sources/{source_id}/jobs", response_model=IndexJobListResponse)
async def website_source_jobs_route(
    source_id: UUID,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IndexJobListResponse:
    jobs = await get_jobs(db, source_id, user.user_id)
    return IndexJobListResponse(jobs=jobs)


@router.get("/usage", response_model=WebsiteUsageResponse)
async def website_usage_route(
    agent_id: UUID = Query(...),
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WebsiteUsageResponse:
    return await get_agent_website_usage(db, user.user_id, agent_id)
