# ---------------------------------------------------------------------------
# Fallback copy helpers (escalation-aware)
# ---------------------------------------------------------------------------


def excerpt_fallback_instruction(
    fallback_message: str,
    *,
    escalation_enabled: bool,
) -> str:
    fb = (fallback_message or "").strip()
    if escalation_enabled and fb:
        return (
            "If the excerpts above do not contain a concrete answer to the customer's question, "
            "use this fallback message exactly as written — do not paraphrase or append to it:\n"
            f"{fb}"
        )
    return (
        "If the excerpts truly do not contain the fact the customer asked for, "
        "say briefly and honestly what you cannot confirm from the index. "
        "Do not mention escalating to a human, live agents, or handoff — "
        "that is not available in this configuration."
    )


def shopify_supplement_fallback_instruction(
    fallback_message: str,
    *,
    escalation_enabled: bool,
) -> str:
    fb = (fallback_message or "").strip()
    if escalation_enabled and fb:
        return (
            "Use the fallback message below **only** when neither the Shopify tools (after you have called them) "
            "nor the knowledge-base excerpts provide a concrete answer, "
            f"or when the question is general chitchat with no store-specific answer needed.\n{fb}"
        )
    if fb:
        return (
            "Use the fallback message below **only** when neither the Shopify tools (after you have called them) "
            "nor the knowledge-base excerpts provide a concrete answer, "
            "or when the question is general chitchat — "
            "do not mention human escalation or handoff; suggest the website or official contact channels instead.\n"
            f"{fb}"
        )
    return (
        "If tools and excerpts do not support a concrete answer, "
        "say what you cannot confirm in one sentence and point to the website or official contact channels. "
        "Do not mention human escalation."
    )
