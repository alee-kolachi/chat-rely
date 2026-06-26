"""LLM polish for demo product detail panels (grounded facts only)."""

from __future__ import annotations

import json
from typing import Any

import structlog
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.core.settings import get_settings

log = structlog.get_logger("demo.product_detail_presenter")


class PolishedProductOption(BaseModel):
    name: str
    values: list[str] = Field(default_factory=list, max_length=24)


class ProductDetailPresentation(BaseModel):
    description_points: list[str] = Field(default_factory=list, max_length=8)
    options: list[PolishedProductOption] = Field(default_factory=list, max_length=4)


def _grounded_detail_context(detail: dict[str, Any]) -> dict[str, Any]:
    points = detail.get("description_points")
    if not isinstance(points, list) or not points:
        desc = detail.get("description")
        points = [desc] if isinstance(desc, str) and desc.strip() else []
    options = detail.get("options") if isinstance(detail.get("options"), list) else []
    variants = detail.get("variants") if isinstance(detail.get("variants"), list) else []
    return {
        "title": detail.get("title"),
        "price": detail.get("price"),
        "vendor": detail.get("vendor"),
        "product_type": detail.get("product_type"),
        "sku": detail.get("sku"),
        "description_points": [str(p).strip() for p in points if str(p).strip()][:12],
        "options": options[:4],
        "variants": variants[:12],
    }


def apply_product_detail_presentation(
    detail: dict[str, Any],
    presentation: ProductDetailPresentation,
) -> dict[str, Any]:
    points = [p.strip() for p in presentation.description_points if p.strip()]
    if points:
        detail["description_points"] = points[:8]
        detail.pop("description", None)
    polished_options: list[dict[str, object]] = []
    for opt in presentation.options:
        name = opt.name.strip()
        values = [v.strip() for v in opt.values if v.strip()]
        if name and values:
            polished_options.append({"name": name, "values": values[:24]})
    if polished_options:
        detail["options"] = polished_options
    return detail


async def polish_demo_product_detail_with_llm(detail: dict[str, Any]) -> dict[str, Any]:
    """Reformat grounded product facts into shopper-friendly bullets and option chips."""
    context = _grounded_detail_context(detail)
    if not context.get("description_points") and not context.get("options"):
        return detail

    from app.agent.llm import make_groq_chat_model, make_openai_chat_model
    from app.core.openai_keys import ainvoke_with_key_fallback, has_chat_llm_key

    settings = get_settings()
    if not has_chat_llm_key(settings):
        return detail

    model_name = settings.openai_chat_model or "gpt-4o-mini"
    sys = SystemMessage(
        content=(
            "You format product detail panels for a storefront support chatbot. "
            "Use ONLY facts present in the product JSON. "
            "Do not invent materials, features, sizes, prices, or care instructions. "
            "Rewrite description_points as short clear bullets in plain language. "
            "Keep option names and values faithful to the source; you may fix spacing only. "
            "Return structured output only."
        )
    )
    human = HumanMessage(
        content=(
            "Format this product for the detail panel:\n"
            f"{json.dumps(context, ensure_ascii=False)}\n\n"
            "Return description_points and options only."
        )
    )

    try:
        result = await ainvoke_with_key_fallback(
            lambda api_key: make_openai_chat_model(
                model_name,
                api_key=api_key,
                timeout=20,
                max_retries=1,
            ).with_structured_output(ProductDetailPresentation),
            [sys, human],
            settings=settings,
            build_groq_llm=lambda: make_groq_chat_model(
                timeout=20,
                max_retries=1,
                streaming=False,
            ).with_structured_output(ProductDetailPresentation),
        )
        if not isinstance(result, ProductDetailPresentation):
            return detail
        return apply_product_detail_presentation(detail, result)
    except Exception:
        log.warning("demo.product_detail_polish_failed", exc_info=True)
        return detail
