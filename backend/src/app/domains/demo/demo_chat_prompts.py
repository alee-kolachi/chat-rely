"""Demo chat prompts: answer from KB excerpts without merchant decline boilerplate."""


def build_demo_kb_user_prompt(context_block: str, user_message: str) -> str:
    """RAG-only user turn for demo outreach (no tool-decline fallback copy)."""
    return (
        "Answer using ONLY the store excerpts below.\n"
        "- State the policy facts directly in short plain language (bullets OK).\n"
        "- If the excerpts describe returns, refunds, or exchanges, summarize that policy.\n"
        "- Do not say you are unsure when the excerpts contain the answer.\n"
        "- Do not mention excerpts, indexes, retrieval, or tools.\n\n"
        f"{context_block.strip()}\n\n"
        f"Customer question:\n{user_message.strip()}"
    )


def build_demo_kb_system_appendix() -> str:
    return (
        "This turn is grounded in indexed store policy and FAQ excerpts in the user message. "
        "Answer from those excerpts only. Keep the reply brief."
    )
