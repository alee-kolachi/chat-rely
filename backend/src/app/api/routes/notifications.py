from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_current_user, get_db
from app.domains.notifications.schemas import (
    MarkNotificationsReadRequest,
    MarkNotificationsReadResponse,
    NotificationListResponse,
)
from app.domains.notifications.service import list_notifications, mark_notifications_read

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
async def list_notifications_route(
    limit: int = Query(default=50, ge=1, le=100),
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationListResponse:
    items, unread = await list_notifications(db, user_id=user.user_id, limit=limit)
    return NotificationListResponse(notifications=items, unread_count=unread)


@router.post("/read", response_model=MarkNotificationsReadResponse)
async def mark_notifications_read_route(
    payload: MarkNotificationsReadRequest,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MarkNotificationsReadResponse:
    n = await mark_notifications_read(
        db,
        user_id=user.user_id,
        notification_ids=payload.notification_ids,
        mark_all=payload.mark_all,
    )
    return MarkNotificationsReadResponse(updated=n)
