"""Public demo page config and chat helpers."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.domains.demo.constants import DEMO_LIFETIME_MESSAGE_CAP, DEMO_SHOPIFY_INSTALL_URL
from app.domains.demo.demo_product_cards import product_dict_to_card
from app.domains.demo.demo_sheet_fields import (
    build_demo_welcome_social_links,
    logo_link_from_sheet_snapshot,
)
from app.domains.demo.repository import fetch_demo_by_slug, update_demo_logo_url
from app.domains.demo.schemas import DemoOutreachDTO, DemoPublicConfigResponse, DemoTopProduct
from app.domains.demo.store_branding import is_light_background_logo_url, refine_demo_brand_color, upgrade_logo_asset_url
from app.domains.demo.storefront_ingest import fetch_store_logo_url
from app.domains.demo.system_user import ensure_demo_system_user


def build_top_products(products: list[dict]) -> list[DemoTopProduct]:
    out: list[DemoTopProduct] = []
    for row in products[:6]:
        card = product_dict_to_card(row)
        if card:
            out.append(DemoTopProduct.model_validate(card))
    return out


def _normalize_brand_color(value: str | None) -> str | None:
    if not value or not str(value).strip():
        return None
    raw = str(value).strip()
    if raw.startswith("#") and len(raw) in {4, 7}:
        return raw
    if raw.startswith("#"):
        return raw
    return raw if raw.startswith("#") else f"#{raw}"


async def fetch_agent_brand_color(db: AsyncSession, agent_id: UUID) -> str | None:
    row = (
        await db.execute(
            text(
                """
                select behavior_settings
                from public.agents
                where id = cast(:agent_id as uuid)
                limit 1
                """
            ),
            {"agent_id": str(agent_id)},
        )
    ).mappings().first()
    if not row:
        return None
    settings = row.get("behavior_settings")
    if isinstance(settings, str):
        import json

        try:
            settings = json.loads(settings)
        except json.JSONDecodeError:
            return None
    if not isinstance(settings, dict):
        return None
    brand = settings.get("brand_color")
    if isinstance(brand, str) and brand.strip():
        return _normalize_brand_color(brand.strip())
    return None


def build_demo_public_config(
    demo: object,
    *,
    top_products: list[DemoTopProduct] | None = None,
    brand_color: str | None = None,
) -> DemoPublicConfigResponse:
    row = demo if isinstance(demo, DemoOutreachDTO) else DemoOutreachDTO.model_validate(demo)
    display = (row.display_name or row.store_host or "this store").strip()
    chat_available = row.status in ("ready", "needs_review")
    limit_message = None
    if row.status not in ("ready", "needs_review"):
        limit_message = "This demo is still being prepared."
    elif row.lifetime_message_count >= DEMO_LIFETIME_MESSAGE_CAP:
        limit_message = "This demo has reached its message limit."

    resolved_brand = _normalize_brand_color(brand_color) or _normalize_brand_color(row.brand_color)
    if resolved_brand:
        resolved_brand = refine_demo_brand_color(resolved_brand) or resolved_brand
    resolved_logo = (
        logo_link_from_sheet_snapshot(row.sheet_snapshot) or upgrade_logo_asset_url(row.logo_url)
    )

    social_links = build_demo_welcome_social_links(
        store_url=row.store_url,
        sheet_snapshot=row.sheet_snapshot,
    )

    return DemoPublicConfigResponse(
        slug=row.slug,
        status=row.status,
        display_name=display,
        logo_url=resolved_logo,
        store_url=row.store_url,
        product_count=row.product_count,
        suggested_prompts=row.suggested_prompts,
        top_products=top_products or [],
        brand_color=resolved_brand,
        install_url=DEMO_SHOPIFY_INSTALL_URL,
        demo_limitation_line=(
            f"This demo runs on {display}'s public catalog. "
            "Connect your store to unlock live inventory and order tracking."
        ),
        chat_available=chat_available,
        limit_message=limit_message,
        welcome_screen_enabled=True,
        welcome_screen_headline="How can we help?",
        welcome_screen_headline_color="#FFFFFF",
        welcome_screen_description="Ask about orders, products, or store policies.",
        welcome_screen_button_label="Chat with us",
        welcome_screen_social_links=social_links,
    )


async def get_demo_public_config(db: AsyncSession, slug: str) -> DemoPublicConfigResponse:
    demo = await fetch_demo_by_slug(db, slug)
    if demo is None:
        raise AppError(code="demo.not_found", message="Demo not found", status_code=404)

    sheet_logo = logo_link_from_sheet_snapshot(demo.sheet_snapshot)
    if not sheet_logo:
        logo_url = upgrade_logo_asset_url(demo.logo_url)
        if is_light_background_logo_url(logo_url):
            refreshed = await fetch_store_logo_url(demo.store_url)
            refreshed = upgrade_logo_asset_url(refreshed)
            if refreshed and refreshed != logo_url:
                logo_url = refreshed
                await update_demo_logo_url(db, agent_id=demo.agent_id, logo_url=refreshed)
                demo = demo.model_copy(update={"logo_url": refreshed})

    brand_color = demo.brand_color
    if not brand_color:
        brand_color = await fetch_agent_brand_color(db, demo.agent_id)
    return build_demo_public_config(
        demo,
        top_products=[],
        brand_color=brand_color,
    )


async def resolve_demo_chat_context(
    db: AsyncSession,
    slug: str,
) -> tuple[UUID, UUID]:
    demo = await fetch_demo_by_slug(db, slug)
    if demo is None:
        raise AppError(code="demo.not_found", message="Demo not found", status_code=404)
    user_id = await ensure_demo_system_user(db)
    return user_id, demo.agent_id
