"""Admin reads for demo outreach stores and their prospect conversations."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.domains.admin.conversations_service import list_admin_conversations
from app.domains.admin.schemas import (
    AdminConversationListResponse,
    AdminDemoDetail,
    AdminDemoListItem,
    AdminDemoListResponse,
)
from app.domains.demo.repository import demo_public_url, fetch_demo_by_slug


_DEMO_LIST_SELECT = """
    select
      d.slug,
      d.display_name,
      d.store_url,
      d.store_host,
      d.status::text as status,
      d.product_count,
      d.lifetime_message_count,
      d.ready_at,
      d.expires_at,
      d.created_at,
      coalesce(conv.conversation_count, 0) as conversation_count,
      coalesce(conv.visitor_count, 0) as visitor_count,
      conv.last_conversation_at
    from public.demo_outreach d
    left join lateral (
      select
        count(*)::int as conversation_count,
        count(distinct c.visitor_id)::int as visitor_count,
        max(c.last_activity_at) as last_conversation_at
      from public.conversations c
      where c.agent_id = d.agent_id
    ) conv on true
"""


async def list_admin_demos(
    db: AsyncSession,
    *,
    q: str | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> AdminDemoListResponse:
    page = max(page, 1)
    page_size = max(min(page_size, 200), 1)
    offset = (page - 1) * page_size

    where_clauses: list[str] = []
    params: dict[str, object] = {"limit": page_size, "offset": offset}

    needle = (q or "").strip() or None
    if needle:
        where_clauses.append(
            """
            (
              d.slug ilike '%' || :q || '%'
              or coalesce(d.display_name, '') ilike '%' || :q || '%'
              or d.store_url ilike '%' || :q || '%'
              or d.store_host ilike '%' || :q || '%'
            )
            """
        )
        params["q"] = needle
    if status:
        where_clauses.append("d.status = cast(:status as public.demo_outreach_status)")
        params["status"] = status

    where_sql = ("where " + " and ".join(where_clauses)) if where_clauses else ""

    list_sql = f"""
        {_DEMO_LIST_SELECT}
        {where_sql}
        order by coalesce(conv.last_conversation_at, d.created_at) desc
        limit :limit offset :offset
    """
    count_sql = f"""
        select count(*)::int as total
        from public.demo_outreach d
        {where_sql}
    """

    rows = (await db.execute(text(list_sql), params)).mappings().all()
    items = [
        AdminDemoListItem.model_validate(
            {
                **dict(row),
                "demo_url": demo_public_url(str(row["slug"])),
            }
        )
        for row in rows
    ]

    count_params = {k: v for k, v in params.items() if k not in {"limit", "offset"}}
    total = int((await db.execute(text(count_sql), count_params)).scalar_one())

    return AdminDemoListResponse(items=items, total=total, page=page, page_size=page_size)


async def get_admin_demo_detail(db: AsyncSession, slug: str) -> AdminDemoDetail:
    row = (
        await db.execute(
            text(
                f"""
                select
                  base.*,
                  d.logo_url,
                  d.brand_color,
                  d.suggested_prompts
                from (
                  {_DEMO_LIST_SELECT}
                  where d.slug = :slug
                  limit 1
                ) base
                join public.demo_outreach d on d.slug = base.slug
                """
            ),
            {"slug": slug.strip()},
        )
    ).mappings().first()
    if row is None:
        raise AppError(
            code="admin.demo_not_found",
            message="Demo store not found",
            status_code=404,
        )

    prompts = row.get("suggested_prompts")
    if not isinstance(prompts, list):
        prompts = []

    data = dict(row)
    for key in ("logo_url", "brand_color", "suggested_prompts"):
        data.pop(key, None)

    return AdminDemoDetail.model_validate(
        {
            **data,
            "demo_url": demo_public_url(str(row["slug"])),
            "logo_url": row.get("logo_url"),
            "brand_color": row.get("brand_color"),
            "suggested_prompts": [str(p) for p in prompts],
        }
    )


async def list_admin_demo_conversations(
    db: AsyncSession,
    slug: str,
    *,
    visitor_id: str | None = None,
    status: str | None = None,
    started_after: datetime | None = None,
    started_before: datetime | None = None,
    page: int = 1,
    page_size: int = 50,
) -> AdminConversationListResponse:
    demo = await fetch_demo_by_slug(db, slug)
    if demo is None:
        raise AppError(
            code="admin.demo_not_found",
            message="Demo store not found",
            status_code=404,
        )
    return await list_admin_conversations(
        db,
        agent_id=demo.agent_id,
        visitor_id=visitor_id,
        status=status,
        started_after=started_after,
        started_before=started_before,
        page=page,
        page_size=page_size,
    )
