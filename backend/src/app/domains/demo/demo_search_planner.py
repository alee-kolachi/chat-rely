"""LLM-planned storefront search queries for demo chat (keyword search, not embeddings)."""

from __future__ import annotations

from typing import Literal

import structlog
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.core.settings import get_settings
from app.domains.demo.demo_catalog_grounding import demo_query_tokens

log = structlog.get_logger("demo.search_planner")

_POLICY_HINTS = frozenset(
    {
        "return",
        "refund",
        "shipping",
        "exchange",
        "policy",
        "delivery",
        "warranty",
        "ship",
        "deliver",
    }
)


class DemoSearchPlan(BaseModel):
    intent: Literal["product", "policy", "general"] = "product"
    search_queries: list[str] = Field(default_factory=list, max_length=4)
    policy_topics: list[str] = Field(default_factory=list, max_length=4)


def _looks_like_policy_question(message: str) -> bool:
    q = (message or "").casefold()
    return any(hint in q for hint in _POLICY_HINTS)


def _policy_topics_from_message(message: str) -> list[str]:
    q = (message or "").casefold()
    topics: list[str] = []
    if any(h in q for h in ("return", "refund", "exchange")):
        topics.append("refund")
    if any(h in q for h in ("ship", "deliver", "shipping", "delivery")):
        topics.append("shipping")
    if "privacy" in q:
        topics.append("privacy")
    if any(h in q for h in ("terms", "warranty")):
        topics.append("terms")
    return topics or ["refund", "shipping"]


def fallback_demo_search_plan(user_message: str) -> DemoSearchPlan:
    """Deterministic plan when the planner LLM is unavailable."""
    msg = (user_message or "").strip()
    if not msg:
        return DemoSearchPlan(intent="general", search_queries=[])

    if _looks_like_policy_question(msg):
        return DemoSearchPlan(
            intent="policy",
            search_queries=[],
            policy_topics=_policy_topics_from_message(msg),
        )

    tokens = demo_query_tokens(msg)
    queries: list[str] = []
    if msg:
        queries.append(msg[:120])
    if tokens:
        queries.append(" ".join(tokens[:5]))
        if len(tokens) >= 2:
            queries.append(" ".join(tokens[:2]))
    deduped = list(dict.fromkeys(q.strip() for q in queries if q.strip()))
    return DemoSearchPlan(
        intent="product",
        search_queries=deduped[:4],
    )


async def plan_demo_store_search(
    user_message: str,
    *,
    recent_user_messages: list[str] | None = None,
) -> DemoSearchPlan:
    """Use a fast LLM pass to turn the shopper message into storefront search phrases."""
    msg = (user_message or "").strip()
    if not msg:
        return DemoSearchPlan(intent="general", search_queries=[])

    from app.agent.llm import make_groq_chat_model, make_openai_chat_model
    from app.core.openai_keys import ainvoke_with_key_fallback, has_chat_llm_key

    settings = get_settings()
    if not has_chat_llm_key(settings):
        return fallback_demo_search_plan(msg)

    history = [m.strip() for m in (recent_user_messages or []) if m and m.strip()][-2:]
    context_block = ""
    if history:
        context_block = "Recent shopper messages:\n" + "\n".join(f"- {line}" for line in history) + "\n\n"

    model_name = settings.openai_chat_model or "gpt-4o-mini"
    sys = SystemMessage(
        content=(
            "You plan keyword searches on a Shopify storefront for a support demo bot. "
            "Output 1-4 short search phrases (product names, categories, materials, use cases) "
            "that would find relevant products via the store's keyword search. "
            "Use the shopper's exact product names when given. "
            "For returns/shipping/policy questions set intent=policy and policy_topics "
            "(refund, shipping, privacy, terms). "
            "For greetings or vague store questions with no product, intent=general and empty search_queries."
        )
    )
    human = HumanMessage(
        content=f"{context_block}Current message:\n{msg}\n\nReturn structured search plan only."
    )

    try:
        result = await ainvoke_with_key_fallback(
            lambda api_key: make_openai_chat_model(
                model_name,
                api_key=api_key,
                timeout=20,
                max_retries=1,
            ).with_structured_output(DemoSearchPlan),
            [sys, human],
            settings=settings,
            build_groq_llm=lambda: make_groq_chat_model(
                timeout=20,
                max_retries=1,
                streaming=False,
            ).with_structured_output(DemoSearchPlan),
        )
        if not isinstance(result, DemoSearchPlan):
            return fallback_demo_search_plan(msg)
        if result.intent == "product":
            cleaned = [q.strip() for q in result.search_queries if q.strip()]
            if not cleaned:
                return fallback_demo_search_plan(msg)
            result.search_queries = cleaned[:4]
        return result
    except Exception:
        log.warning("demo.search_plan_failed", exc_info=True)
        return fallback_demo_search_plan(msg)
