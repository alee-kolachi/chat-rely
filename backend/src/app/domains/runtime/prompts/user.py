from app.domains.runtime.prompts.fallback import (
    excerpt_fallback_instruction,
    shopify_supplement_fallback_instruction,
)

_EXCERPT_ANSWER_RULES = (
    "ANSWER FROM EXCERPTS\n"
    "- State facts directly from the excerpts — product names, styles, categories, policies, prices.\n"
    "- When excerpts list types, designs, or categories, quote them in a short bulleted list.\n"
    "- Do not replace specific names with vague phrases like 'versatility and timeless style' "
    "unless those words directly answer the question.\n"
    "- Do not say excerpts lack detail when they name concrete types or features.\n"
    "- Do not tell the customer to visit the website or contact support when the excerpts already answer the question.\n"
    "- If the excerpts genuinely do not contain the answer, say briefly what you cannot confirm "
    "and offer the most useful next step — do not guess or paraphrase around the gap.\n"
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
        "Earlier messages in this thread may name products or categories the customer refers to now. "
        "Resolve follow-ups (\"give me options\", \"the one\", \"that boot\") from that context, and pass "
        "specific product or category keywords to Shopify tools—not vague words like \"options\" alone.\n\n"
    )
    return "".join(parts)


def build_chitchat_user_prompt(user_message: str) -> str:
    return (
        "The customer's message is a greeting or small talk — no product, order, or policy question.\n"
        "Reply briefly and warmly. Do not call any tools, search the catalog, "
        "or resurface product cards from earlier turns.\n"
        "Do not invent store details or policies to seem more helpful.\n\n"
        f"Customer message:\n{user_message}"
    )


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
        "The customer is asking about **products or the catalog** — not order status or tracking.\n"
        "- Call `shopify_product_search` with product or category **keywords only** "
        "(e.g. `boots`, `winter jackets`, `Timberland`). Do not pass the full conversational sentence.\n"
        "- Do **not** call `shopify_order_lookup` — there is no order number or tracking question here.\n"
        "- If `lookup_meta.not_found` is true, tell the customer that item is not in this store's catalog. "
        "Do not suggest it might be listed elsewhere or invent availability.\n"
        "- If the customer says results are the wrong category, search again with their category keywords. "
        "If still not found, say this store may not carry that category — do not show unrelated products.\n"
        "- When results are returned, keep your intro to one sentence under 12 words; "
        "the UI shows product cards with images and links, so do not list names, prices, or bullets in text.\n\n"
        f"Customer message:\n{user_message}"
    )


def build_multi_intent_shopify_user_prompt(
    user_message: str,
    *,
    has_order_lookup_tool: bool,
    has_product_search_tool: bool,
) -> str:
    order_line = (
        "- **Order / tracking part:** call `shopify_order_lookup` with the order number or email provided.\n"
        if has_order_lookup_tool
        else (
            "- **Order / tracking part:** Order Lookup is **not** enabled — "
            "do not call `shopify_product_search` for order status. "
            "Tell the customer you cannot check orders live and suggest they contact the store.\n"
        )
    )
    catalog_line = (
        "- **Catalog / product part:** call `shopify_product_search` with product keywords only.\n"
        if has_product_search_tool
        else "- **Catalog / product part:** Product Search is not enabled — say you cannot browse the live catalog.\n"
    )
    return (
        "This message covers **more than one topic** (order/shipping and catalog/products).\n"
        "- Call every applicable enabled tool in the **same** turn before composing your reply.\n"
        "- Answer both parts briefly in one reply. Short bullets are fine.\n"
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
            f"The following excerpts are **supplementary** context from the brand's knowledge index. "
            f"They may be outdated or not directly relevant to this question — "
            f"do not treat them as this store's live catalog or authoritative source for products, pricing, or stock.\n\n"
            f"{context_block}\n\n"
            f"**Grounding rules:** For products, catalog, availability, pricing, orders, tracking, and inventory "
            f"for **this connected store**, you **must** use the enabled Shopify tools. "
            f"Never answer those topics from excerpts alone. "
            f"Use excerpts only for policies, FAQs, returns, shipping rules, and static copy "
            f"when they clearly apply to this store and Shopify tools do not cover them.\n"
            f"{fb_line}\n\n"
            f"{follow_up}"
            f"Customer message:\n{user_message}"
        )
    fb_line = excerpt_fallback_instruction(
        fallback_message,
        escalation_enabled=escalation_enabled,
    )
    return (
        f"The following excerpts are the best-matching passages from the brand's knowledge index. "
        f"Answer the customer's question using them as your primary source.\n\n"
        f"{_EXCERPT_ANSWER_RULES}\n\n"
        f"{context_block}\n\n"
        f"{fb_line}\n\n"
        f"Customer message:\n{user_message}"
    )
