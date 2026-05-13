"""Canonical plan limits from `public.plans` columns + `features` JSON (single source for enforcement)."""

from __future__ import annotations

from typing import Any, Literal

from app.domains.plans.schemas import PlanLimitsDTO

# Default when plan features omit storage keys (legacy / misconfigured rows).
DEFAULT_KNOWLEDGE_STORAGE_CAP_BYTES = 100 * 1024 * 1024
STARTER_KNOWLEDGE_STORAGE_CAP_BYTES = 500 * 1024


def training_storage_cap_bytes(features: dict[str, Any] | object) -> int:
    """
    Total indexed knowledge cap (website + files + snippets + Q&A share one pool).

    When multiple caps are present (e.g. Free has both ``max_total_knowledge_mb`` and
    ``max_knowledge_storage_kb``), the **strictest** (minimum) applies so marketing KB limits win.
    """
    if not isinstance(features, dict):
        return DEFAULT_KNOWLEDGE_STORAGE_CAP_BYTES
    caps: list[int] = []
    total_mb = features.get("max_total_knowledge_mb")
    if isinstance(total_mb, (int, float)) and total_mb > 0:
        caps.append(int(total_mb * 1024 * 1024))
    kb = features.get("max_knowledge_storage_kb")
    if isinstance(kb, (int, float)) and kb > 0:
        caps.append(int(kb * 1024))
    mb = features.get("max_file_storage_mb")
    if isinstance(mb, (int, float)) and mb > 0:
        caps.append(int(mb * 1024 * 1024))
    if caps:
        return min(caps)
    return DEFAULT_KNOWLEDGE_STORAGE_CAP_BYTES


def website_crawl_cap_bytes(features: dict[str, Any] | object, storage_cap_bytes: int) -> int:
    """HTTP crawl budget per site; defaults to the total knowledge pool when unset."""
    if not isinstance(features, dict):
        return max(0, storage_cap_bytes)
    crawl_kb = features.get("max_website_crawl_kb")
    if isinstance(crawl_kb, (int, float)) and crawl_kb > 0:
        return min(int(crawl_kb * 1024), max(0, storage_cap_bytes))
    return max(0, storage_cap_bytes)


def plan_limits_dto_from_row(
    *,
    included_conversations: int,
    max_agents: int,
    features: dict[str, Any],
) -> PlanLimitsDTO:
    storage = training_storage_cap_bytes(features)
    crawl = website_crawl_cap_bytes(features, storage)
    max_actions = int(features.get("max_enabled_actions_per_agent") or 0)
    return PlanLimitsDTO(
        included_conversations=max(0, int(included_conversations)),
        max_agents=max(1, int(max_agents)),
        max_enabled_actions_per_agent=max(0, max_actions),
        max_total_knowledge_bytes=storage,
        max_website_crawl_bytes=crawl,
    )


SOURCE_SUGGESTIONS_PLAN_SLUGS = frozenset({"standard", "pro"})


def sources_suggestions_enabled_for_plan_slug(plan_slug: str | None) -> bool:
    """AI-derived gaps to add as knowledge sources — enabled on Standard & Pro only."""
    s = (plan_slug or "").strip().lower()
    return s in SOURCE_SUGGESTIONS_PLAN_SLUGS


AnalyticsAccessTier = Literal["none", "basic", "full"]


def message_feedback_enabled_for_plan_slug(plan_slug: str | None) -> bool:
    """Visitor thumbs + feedback analytics — Pro and legacy Scale."""
    s = (plan_slug or "").strip().lower()
    return s in frozenset({"pro", "scale"})


def analytics_access_tier_for_plan_slug(plan_slug: str | None) -> AnalyticsAccessTier:
    """
    Analytics API / page access:
    - ``none``: Free (and unknown slugs) — no analytics product surface.
    - ``basic``: Hobby — KPIs + conversation volume trend only.
    - ``full``: Standard, Pro, and legacy Scale — intents, geo, sentiment, quality.
    """
    s = (plan_slug or "").strip().lower()
    if not s or s == "free":
        return "none"
    if s == "hobby":
        return "basic"
    if s in frozenset({"standard", "pro", "scale"}):
        return "full"
    return "none"
