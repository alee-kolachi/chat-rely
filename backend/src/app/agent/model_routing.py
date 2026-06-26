"""Plan-aware model selection: essential (mini) vs premium (4o) by plan and conversation usage."""

from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from typing import Any

import structlog
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, ConfigDict

from app.agent.llm import make_chat_model, make_groq_chat_model
from app.core.openai_keys import ainvoke_with_key_fallback
from app.agent.messages import usage_tokens_from_model_message
from app.core.settings import Settings, get_settings
from app.domains.plans.plan_limits import PlanModelPolicy

log = structlog.get_logger("model_routing")


class ClassifierResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    use_premium: bool = False
    reason: str = ""


@dataclass(frozen=True)
class TurnModelDecision:
    model: str
    used_premium: bool
    classifier_ran: bool
    classifier_reason: str = ""


def build_classifier_system_prompt(
    *,
    plan_slug: str,
    premium_remaining: int,
    conversation_premium_used: int,
    max_per_conversation: int,
) -> str:
    return (
        "You are a routing gate for a customer-support chatbot. You do NOT answer the customer.\n"
        "Return JSON only: {\"use_premium\": boolean, \"reason\": string}.\n"
        f"Merchant plan: {plan_slug}. "
        f"Advanced-model replies remaining this month: {premium_remaining}. "
        f"Advanced replies used in this conversation: {conversation_premium_used} "
        f"(cap: {max_per_conversation}).\n\n"
        "Set use_premium=true when the message needs deeper reasoning:\n"
        "- Order, shipping, or refund dispute with missing or conflicting details\n"
        "- Policy interpretation, exceptions, or edge cases\n"
        "- Multi-part question with several constraints\n"
        "- A Shopify or knowledge tool returned empty or an error on a prior turn "
        "and the question is a factual store question (not chitchat)\n"
        "- Complaint or frustration requiring careful de-escalation and resolution\n\n"
        "Set use_premium=false for:\n"
        "- Greetings, thanks, ok, bye, or any small talk\n"
        "- Single simple FAQ answerable from excerpts\n"
        "- Catalog browse or product search with no dispute\n"
        "- Any turn when unsure (bias false to conserve capacity)\n"
        "- When premium_remaining is 0 or the conversation cap is reached\n\n"
        "Never set use_premium=true when premium_remaining is 0 or "
        "conversation_premium_used >= max_per_conversation."
    )


def build_classifier_user_content(
    *,
    user_message: str,
    thread_summary: str,
    tool_failed: bool,
) -> str:
    parts = [f"Latest user message:\n{user_message.strip()}"]
    if thread_summary.strip():
        parts.append(f"Thread summary:\n{thread_summary.strip()}")
    if tool_failed:
        parts.append("Note: a Shopify or knowledge tool failed or returned empty on a prior turn.")
    return "\n\n".join(parts)


def should_run_classifier(
    *,
    policy: PlanModelPolicy,
    throttle_tier: str | None,
    premium_remaining: int,
    conversation_premium_used: int,
    routing_enabled: bool,
    max_per_conversation: int,
    is_greeting_or_small_talk: bool = False,
) -> bool:
    if not routing_enabled:
        return False
    if policy.included_premium_turns <= 0 or premium_remaining <= 0:
        return False
    if (throttle_tier or "").strip().lower() == "strong":
        return False
    if conversation_premium_used >= max_per_conversation:
        return False
    if is_greeting_or_small_talk:
        return False
    return True


async def run_complexity_classifier(
    *,
    policy: PlanModelPolicy,
    user_message: str,
    thread_summary: str,
    tool_failed: bool,
    premium_remaining: int,
    conversation_premium_used: int,
    settings: Settings | None = None,
) -> tuple[ClassifierResult, dict[str, Any]]:
    """Cheap structured routing call; does not count as a premium turn."""
    settings = settings or get_settings()
    max_per = max(1, int(settings.runtime_max_premium_turns_per_conversation))
    router_model = settings.runtime_default_chat_model or "gpt-4o-mini"
    sys = build_classifier_system_prompt(
        plan_slug=policy.plan_slug,
        premium_remaining=premium_remaining,
        conversation_premium_used=conversation_premium_used,
        max_per_conversation=max_per,
    )
    user_content = build_classifier_user_content(
        user_message=user_message,
        thread_summary=thread_summary,
        tool_failed=tool_failed,
    )
    billing: dict[str, Any] = {"model": router_model, "input_tokens": 0, "output_tokens": 0}
    try:
        msg = await ainvoke_with_key_fallback(
            lambda api_key: make_chat_model(router_model, temperature=0.0, api_key=api_key).bind(
                response_format={"type": "json_object"},
            ),
            [SystemMessage(content=sys), HumanMessage(content=user_content)],
            settings=settings,
            build_groq_llm=lambda: make_groq_chat_model(temperature=0.0, streaming=False).bind(
                response_format={"type": "json_object"},
            ),
        )
        in_t, out_t = usage_tokens_from_model_message(msg)
        billing["input_tokens"] = in_t
        billing["output_tokens"] = out_t
        raw = msg.content if isinstance(msg.content, str) else str(msg.content or "")
        data = json.loads(raw)
        result = ClassifierResult.model_validate(data)
    except Exception as exc:
        log.warning("model_routing.classifier_failed", error=str(exc))
        result = ClassifierResult(use_premium=False, reason="classifier_error")
    return result, billing


def resolve_turn_model_by_plan_usage(
    *,
    policy: PlanModelPolicy,
    conversations_used: int,
    included_conversations: int,
) -> TurnModelDecision:
    """Free always uses essential (mini). Paid plans use premium (4o) until the monthly conversation cap."""
    default = policy.default_chat_model
    premium = policy.premium_chat_model
    slug = (policy.plan_slug or "free").strip().lower()

    if slug == "free":
        return TurnModelDecision(model=default, used_premium=False, classifier_ran=False)

    included = max(0, int(included_conversations))
    used = max(0, int(conversations_used))
    if included > 0 and used < included:
        return TurnModelDecision(
            model=premium,
            used_premium=True,
            classifier_ran=False,
            classifier_reason="under_conversation_limit",
        )
    return TurnModelDecision(
        model=default,
        used_premium=False,
        classifier_ran=False,
        classifier_reason="over_conversation_limit",
    )


def resolve_turn_model_sync(
    *,
    policy: PlanModelPolicy,
    throttle_tier: str | None,
    premium_remaining: int,
    conversation_premium_used: int,
    classifier: ClassifierResult | None,
    routing_enabled: bool,
) -> TurnModelDecision:
    """Legacy classifier path (tests / fallback). Production turns use ``resolve_turn_model_by_plan_usage``."""
    default = policy.default_chat_model
    premium = policy.premium_chat_model

    if not routing_enabled or policy.included_premium_turns <= 0:
        return TurnModelDecision(model=default, used_premium=False, classifier_ran=False)

    if (throttle_tier or "").strip().lower() == "strong":
        return TurnModelDecision(model=default, used_premium=False, classifier_ran=False)

    if premium_remaining <= 0:
        return TurnModelDecision(model=default, used_premium=False, classifier_ran=False)

    if classifier and classifier.use_premium:
        return TurnModelDecision(
            model=premium,
            used_premium=True,
            classifier_ran=True,
            classifier_reason=classifier.reason,
        )
    return TurnModelDecision(
        model=default,
        used_premium=False,
        classifier_ran=classifier is not None,
        classifier_reason=(classifier.reason if classifier else ""),
    )


async def resolve_turn_model(
    *,
    policy: PlanModelPolicy,
    throttle_tier: str | None,
    premium_turns_used: int,
    conversation_premium_used: int,
    user_message: str,
    thread_summary: str = "",
    tool_failed: bool = False,
    is_greeting_or_small_talk: bool = False,
    settings: Settings | None = None,
) -> tuple[TurnModelDecision, dict[str, Any] | None]:
    """Pick model for this turn; returns optional classifier billing metadata."""
    settings = settings or get_settings()
    premium_remaining = max(0, policy.included_premium_turns - premium_turns_used)
    routing_enabled = bool(settings.runtime_model_routing_enabled)
    max_per = max(1, int(settings.runtime_max_premium_turns_per_conversation))

    classifier: ClassifierResult | None = None
    classifier_billing: dict[str, Any] | None = None

    if should_run_classifier(
        policy=policy,
        throttle_tier=throttle_tier,
        premium_remaining=premium_remaining,
        conversation_premium_used=conversation_premium_used,
        routing_enabled=routing_enabled,
        max_per_conversation=max_per,
        is_greeting_or_small_talk=is_greeting_or_small_talk,
    ):
        classifier, classifier_billing = await run_complexity_classifier(
            policy=policy,
            user_message=user_message,
            thread_summary=thread_summary,
            tool_failed=tool_failed,
            premium_remaining=premium_remaining,
            conversation_premium_used=conversation_premium_used,
            settings=settings,
        )

    decision = resolve_turn_model_sync(
        policy=policy,
        throttle_tier=throttle_tier,
        premium_remaining=premium_remaining,
        conversation_premium_used=conversation_premium_used,
        classifier=classifier,
        routing_enabled=routing_enabled,
    )
    return decision, classifier_billing


def thread_summary_from_history(history_rows: list[Any], *, max_chars: int = 400) -> str:
    lines: list[str] = []
    for row in history_rows[-4:]:
        role = getattr(row, "role", None) or (row.get("role") if isinstance(row, dict) else "")
        content = getattr(row, "content", None) or (row.get("content") if isinstance(row, dict) else "")
        if role and content:
            lines.append(f"{role}: {str(content)[:120]}")
    text = "\n".join(lines)
    return text[:max_chars] if len(text) > max_chars else text


async def apply_throttle_delay(
    *,
    throttle_tier: str | None,
    policy: PlanModelPolicy,
    conversations_used: int,
    included_conversations: int,
    premium_turns_used: int = 0,
) -> int:
    """Sleep before LLM when over the monthly conversation cap. Returns delay ms applied."""
    tier = (throttle_tier or "").strip().lower()
    delay_ms = 0
    included = max(0, int(included_conversations))
    used = max(0, int(conversations_used))
    if tier == "strong":
        delay_ms = int(policy.throttle_policy.get("strong_delay_ms") or 0)
    elif included > 0 and used >= included:
        delay_ms = int(policy.throttle_policy.get("soft_delay_ms") or 0)
    elif policy.included_premium_turns > 0 and premium_turns_used >= policy.included_premium_turns:
        delay_ms = int(policy.throttle_policy.get("soft_delay_ms") or 0)

    if delay_ms > 0:
        await asyncio.sleep(delay_ms / 1000.0)
    return delay_ms
