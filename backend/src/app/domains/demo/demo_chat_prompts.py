"""Demo chat prompts: answer from KB excerpts without merchant decline boilerplate."""


def build_demo_kb_user_prompt(context_block: str, user_message: str) -> str:
    """RAG-only user turn for demo outreach (no tool-decline fallback copy)."""
    return (
        "Answer using ONLY the store excerpts below.\n"
        "- Summarize the actual policy rules (time limits, conditions, fees) in short plain language.\n"
        "- Use bullets when listing steps or conditions.\n"
        "- If the excerpts describe returns, refunds, or exchanges, state those rules directly.\n"
        "- Do not reply with only a link or tell the customer to visit the site when the excerpts "
        "already contain the policy.\n"
        "- Do not say you are unsure when the excerpts contain the answer.\n"
        "- Do not mention excerpts, indexes, retrieval, or tools.\n\n"
        f"{context_block.strip()}\n\n"
        f"Customer question:\n{user_message.strip()}"
    )


def build_demo_kb_system_appendix() -> str:
    return (
        "This turn is grounded in indexed store policy and FAQ excerpts in the user message. "
        "Answer from those excerpts only. State the policy facts directly. "
        "Keep the reply brief (a few sentences or tight bullets). "
        "Do not deflect to a policy page when the excerpts already answer the question."
    )


def build_demo_catalog_system_appendix() -> str:
    return (
        "Live catalog tools are enabled for this store.\n"
        "- For sizes, colors, materials, or variants: search for the product, then call "
        "shopify_product_details with its handle and answer from variant/options data.\n"
        "- When listing colors or sizes, use a short bullet list with plain text only. "
        "No markdown links, images, or URLs in the reply.\n"
        "- For price questions: state the price in one sentence, then list available colors or "
        "sizes as plain bullets if relevant.\n"
        "- For general catalog browse: one or two short sentences describing what the store carries, "
        "then product cards may appear separately.\n"
        "- Do not tell the customer to check the website when tool results already contain the answer."
    )
