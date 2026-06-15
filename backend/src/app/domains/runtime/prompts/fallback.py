# ---------------------------------------------------------------------------
# Fallback copy helpers (escalation-aware)
# ---------------------------------------------------------------------------

from app.domains.runtime.prompts.grounding import (
    decline_after_excerpts_instruction,
    decline_after_tools_instruction,
)


def excerpt_fallback_instruction(
    fallback_message: str,
    *,
    escalation_enabled: bool,
) -> str:
    return decline_after_excerpts_instruction(
        fallback_message,
        escalation_enabled=escalation_enabled,
    )


def shopify_supplement_fallback_instruction(
    fallback_message: str,
    *,
    escalation_enabled: bool,
) -> str:
    fb = (fallback_message or "").strip()
    base = decline_after_tools_instruction(
        fallback_message,
        escalation_enabled=escalation_enabled,
    )
    if not fb:
        return base
    return (
        f"{base}\n\n"
        "Chitchat with no store-specific question: reply briefly without tools or the fallback above."
    )
