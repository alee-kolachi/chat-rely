from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_db, require_admin
from app.domains.admin.demo_service import (
    get_admin_demo_detail,
    list_admin_demo_conversations,
    list_admin_demos,
)
from app.domains.admin.schemas import (
    AdminConversationListResponse,
    AdminDemoDetail,
    AdminDemoListResponse,
)


router = APIRouter()


@router.get("/demo", response_model=AdminDemoListResponse)
async def list_admin_demos_route(
    q: str | None = Query(
        default=None,
        description="Match store name, URL, host, or demo slug",
    ),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    _: AuthContext = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminDemoListResponse:
    return await list_admin_demos(
        db,
        q=q,
        status=status,
        page=page,
        page_size=page_size,
    )


@router.get("/demo/{slug}", response_model=AdminDemoDetail)
async def get_admin_demo_route(
    slug: str,
    _: AuthContext = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminDemoDetail:
    return await get_admin_demo_detail(db, slug)


@router.get("/demo/{slug}/conversations", response_model=AdminConversationListResponse)
async def list_admin_demo_conversations_route(
    slug: str,
    visitor_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    started_after: datetime | None = Query(default=None),
    started_before: datetime | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    _: AuthContext = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminConversationListResponse:
    return await list_admin_demo_conversations(
        db,
        slug,
        visitor_id=visitor_id,
        status=status,
        started_after=started_after,
        started_before=started_before,
        page=page,
        page_size=page_size,
    )
