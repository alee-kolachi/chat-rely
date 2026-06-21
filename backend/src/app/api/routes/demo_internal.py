"""Optional internal trigger for demo sheet sync."""

from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException

from app.core.settings import get_settings
from app.domains.demo.cleanup import expire_due_demos
from app.domains.demo.sheets_sync import sync_demo_sheet_once
from app.db.session import get_session_factory

router = APIRouter(prefix="/internal/demo", tags=["demo-internal"])


@router.post("/sync-sheets")
async def internal_demo_sync_sheets_route(
    x_demo_secret: str | None = Header(default=None, alias="X-Demo-Secret"),
) -> dict[str, int]:
    expected = (get_settings().demo_internal_secret or "").strip()
    if not expected:
        raise HTTPException(status_code=503, detail="Demo internal sync is not configured")
    if (x_demo_secret or "").strip() != expected:
        raise HTTPException(status_code=401, detail="Invalid demo secret")

    stats: dict[str, int] = {"expired": 0}
    async with get_session_factory()() as db:
        stats["expired"] = await expire_due_demos(db)
    stats.update(await sync_demo_sheet_once())
    return stats
