from app.domains.runtime.prompts.fallback import (
    excerpt_fallback_instruction,
    shopify_supplement_fallback_instruction,
)

_EXCERPT_ANSWER_RULES = (
    "ANSWER FROM EXCERPTS\n"
    "- Lead with specific facts from the excerpts (product types, styles, features, policies).\n"
    "- When the excerpts list styles, designs, or categories, quote them in bullets. "
    "Do not replace them with vague phrases like 'versatility and timeless style' unless those words "
    "directly answer the question.\n"
    "- Do not say the excerpts lack detail when they name concrete types or features.\n"
    "- Do not tell the customer to visit the website, check the website, or contact customer service "
    "when the excerpts already answer their question.\n"
)


def _shopify_thread_follow_up_block(
    *,
    thread_has_prior_turns: bool,
    thread_had_order_lookup: bool = False,
) -> str:
    if not thread_has_prior_turns:
        return ""
    parts: list[str] = []
    if thread_had_order_lookup:
        parts.append(
            "This thread already looked up an order. Resolve order follow-ups "
            "(\"it\", \"that order\", shipping city, tracking, status) from that context—"
            "reuse the same order # with `shopify_order_lookup`; do not ask for the order number again.\n"
        )
    parts.append(
        "Earlier messages in this thread may name products the customer refers to now. "
        "Resolve follow-ups (\"the one\", \"that boot\", sizing) from that context, and pass "
        "product brand or name keywords to Shopify tools—not vague phrases alone.\n\n"
    )
    return "".join(parts)


def build_shopify_turn_user_prompt(
    user_message: str,
    *,
    thread_has_prior_turns: bool = False,
    thread_had_order_lookup: bool = False,
) -> str:
    return (
        f"{_shopify_thread_follow_up_block(thread_has_prior_turns=thread_has_prior_turns, thread_had_order_lookup=thread_had_order_lookup)}"
        f"Customer message:\n{user_message}"
    )


def build_catalog_only_shopify_user_prompt(user_message: str) -> str:
    return (
        "The customer is asking about **products or catalog** only (not order status or tracking).\n"
        "- Call `shopify_product_search` with product name or category keywords from their message.\n"
        "- Do **not** call `shopify_order_lookup` — there is no order # or tracking question in this message.\n"
        "- If `lookup_meta.not_found` is true, say the item is not in this store's catalog.\n\n"
        f"Customer message:\n{user_message}"
    )


def build_multi_intent_shopify_user_prompt(
    user_message: str,
    *,
    has_order_lookup_tool: bool,
    has_product_search_tool: bool,
) -> str:
    order_line = (
        "For the **order / tracking** part: call `shopify_order_lookup` with the order # or email they gave.\n"
        if has_order_lookup_tool
        else (
            "For the **order / tracking** part: Order Lookup is **not** enabled — explain you cannot check "
            "orders live. Do **not** use `shopify_product_search` for order status.\n"
        )
    )
    catalog_line = (
        "For the **catalog / product** part: call `shopify_product_search` with product keywords.\n"
        if has_product_search_tool
        else "For the **catalog / product** part: Product Search is not enabled — say you cannot browse the live catalog.\n"
    )
    return (
        "The customer asked about **more than one topic** in one message (order/shipping and catalog/products).\n"
        "- Call every applicable enabled tool in the **same** turn before answering.\n"
        "- Answer **both** parts briefly in one reply (short bullets are fine).\n"
        f"{order_line}"
        f"{catalog_line}\n"
        f"Customer message:\n{user_message}"
    )


def build_grounded_user_prompt(
    context_block: str,
    fallback_message: str,
    user_message: str,
    *,
    shopify_tools_enabled: bool = False,
    escalation_enabled: bool = False,
    thread_has_prior_turns: bool = False,
    thread_had_order_lookup: bool = False,
) -> str:
    if shopify_tools_enabled:
        fb_line = shopify_supplement_fallback_instruction(
            fallback_message,
            escalation_enabled=escalation_enabled,
        )
        follow_up = _shopify_thread_follow_up_block(
            thread_has_prior_turns=thread_has_prior_turns,
            thread_had_order_lookup=thread_had_order_lookup,
        )
        return (
            f"The following excerpts are **supplementary** context from the brand’s knowledge index. "
            f"They may be outdated, from a different indexed site, or irrelevant to this question — "
            f"do not treat them as this store’s live catalog.\n\n"
            f"{context_block}\n\n"
            f"**Grounding rules:** For products, catalog, availability, pricing, orders, tracking, inventory, "
            f"or purchase history for **this connected store**, you **must** use the enabled Shopify tools — "
            f"never answer those topics from excerpts alone. Use excerpts only for policies, FAQs, returns, "
            f"shipping rules, and static copy when they clearly apply.\n"
            f"{fb_line}\n\n"
            f"{follow_up}"
            f"Customer message:\n{user_message}"
        )
    fb_line = excerpt_fallback_instruction(
        fallback_message,
        escalation_enabled=escalation_enabled,
    )
    return (
        f"The following excerpts are the best-matching passages from the brand’s knowledge index. "
        f"Answer the customer’s question using them.\n\n"
        f"{_EXCERPT_ANSWER_RULES}\n\n"
        f"{context_block}\n\n"
        f"{fb_line}\n\n"
        f"Customer message:\n{user_message}"
    )
