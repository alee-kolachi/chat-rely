from typing import Any, Literal, cast
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.domains.public_widget.schemas import PublicWidgetAgentContext, PublicWidgetConfigResponse

WidgetPosition = Literal["bottom_right", "bottom_left"]


async def resolve_agent_for_widget_key(db: AsyncSession, public_key: str) -> PublicWidgetAgentContext:
    key = (public_key or "").strip()
    if not key:
        raise AppError(code="widget.missing_key", message="Missing agent key", status_code=401)

    row = (
        await db.execute(
            text(
                """
                select id, user_id, name, status, behavior_settings
                from public.agents
                where public_key = :pk
                limit 1
                """
            ),
            {"pk": key},
        )
    ).mappings().first()
    if row is None:
        raise AppError(code="widget.invalid_key", message="Unknown or invalid agent key", status_code=401)

    status = str(row["status"] or "")
    if status != "active":
        raise AppError(
            code="widget.agent_inactive",
            message="This agent is not accepting public chats",
            status_code=403,
        )

    behavior = row["behavior_settings"] if isinstance(row["behavior_settings"], dict) else {}
    return PublicWidgetAgentContext(
        agent_id=UUID(str(row["id"])),
        user_id=UUID(str(row["user_id"])),
        name=str(row["name"] or "Assistant"),
        behavior_settings=behavior,
    )


def build_public_widget_config(ctx: PublicWidgetAgentContext) -> PublicWidgetConfigResponse:
    b: dict[str, Any] = ctx.behavior_settings
    raw_pos = str(b.get("widget_position") or "bottom_right").lower().replace("-", "_")
    position: WidgetPosition = cast(WidgetPosition, raw_pos if raw_pos in ("bottom_right", "bottom_left") else "bottom_right")
    brand = b.get("brand_color")
    brand_color = str(brand).strip() if isinstance(brand, str) and brand.strip() else None
    return PublicWidgetConfigResponse(
        agent_id=ctx.agent_id,
        name=ctx.name,
        brand_color=brand_color,
        widget_position=position,
    )
