"""Shared grounding rules: relevance gate and polite customer-facing declines."""


def relevance_gate_rules(*, weak_match: bool = False) -> str:
    """Instruct the model to ignore tangential retrieved content."""
    weak = (
        "\n- The passages below are only **loosely** related to the question. "
        "Unless they state the exact fact asked for, ignore them completely."
        if weak_match
        else ""
    )
    return (
        "RELEVANCE CHECK (mandatory before every factual reply)\n"
        "- Answer only when tool results or passages **directly** state the fact the customer asked for.\n"
        "- If results are empty, off-topic, or merely adjacent (same site, different topic), "
        "treat that as **no answer** — do not infer, generalize, or use typical store behavior.\n"
        "- Never invent products, categories, prices, policies, timelines, or URLs. "
        "Never use placeholder brackets or template filler.\n"
        f"{weak}"
    ).strip()


def customer_decline_language(*, escalation_enabled: bool = False) -> str:
    """How to decline politely without mentioning retrieval or internal limits."""
    next_step = (
        "offer one concrete next step: the official website, a support or contact page "
        "(only if you know it from confirmed sources), or connecting with the team"
        if escalation_enabled
        else (
            "offer one concrete next step: the official website or a support or contact page "
            "(only if you know it from confirmed sources — never invent URLs)"
        )
    )
    return (
        "CUSTOMER-FACING DECLINES\n"
        "- Reply as the brand. Never mention excerpts, passages, indexes, retrieval, tools, "
        "or limits like 'what I have' or 'what I can see'.\n"
        "- When you cannot answer from confirmed sources: one short polite sentence that you "
        f"are not sure, then {next_step}.\n"
        "- Do not pad with generic industry policies, product ranges, or 'visit our website' "
        "boilerplate when you already failed to find a real answer."
    )


def decline_after_tools_instruction(
    fallback_message: str,
    *,
    escalation_enabled: bool,
) -> str:
    """After Shopify / knowledge tools were available but did not support an answer."""
    fb = (fallback_message or "").strip()
    base = (
        f"{relevance_gate_rules()}\n\n"
        f"{customer_decline_language(escalation_enabled=escalation_enabled)}\n\n"
        "If tools were called and results do not directly answer the question, "
        "or passages are irrelevant, decline politely — do not guess."
    )
    if fb:
        return (
            f"{base}\n\n"
            "Use this reply exactly when declining (do not paraphrase or append):\n"
            f"{fb}"
        )
    return base


def decline_after_excerpts_instruction(
    fallback_message: str,
    *,
    escalation_enabled: bool,
) -> str:
    """KB-only path: excerpts were retrieved but may not answer the question."""
    fb = (fallback_message or "").strip()
    if escalation_enabled and fb:
        return (
            f"{relevance_gate_rules()}\n\n"
            f"{customer_decline_language(escalation_enabled=True)}\n\n"
            "If the passages above do not directly answer the customer's question, "
            "use this reply exactly — do not paraphrase or append:\n"
            f"{fb}"
        )
    if fb:
        return (
            f"{relevance_gate_rules()}\n\n"
            f"{customer_decline_language(escalation_enabled=False)}\n\n"
            "If the passages above do not directly answer the customer's question, "
            "use this reply exactly — do not paraphrase or append:\n"
            f"{fb}"
        )
    return (
        f"{relevance_gate_rules()}\n\n"
        f"{customer_decline_language(escalation_enabled=escalation_enabled)}"
    )


def no_source_system_appendix(*, escalation_enabled: bool = False) -> str:
    """System prompt when no excerpts or tools grounded this turn."""
    esc = (
        " or offer to connect them with the team"
        if escalation_enabled
        else ""
    )
    return (
        f"{relevance_gate_rules()}\n\n"
        f"{customer_decline_language(escalation_enabled=escalation_enabled)}\n\n"
        "For greetings and small talk, reply briefly and warmly.\n"
        "For product, policy, or order questions without confirmed sources: "
        f"decline politely in one or two sentences{esc}. "
        "Use the thread only for follow-ups to answers you already gave from confirmed sources."
    )
