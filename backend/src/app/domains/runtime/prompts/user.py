def build_grounded_user_prompt(
    context_block: str,
    fallback_message: str,
    user_message: str,
    *,
    shopify_tools_enabled: bool = False,
) -> str:
    if shopify_tools_enabled:
        return (
            f"The following excerpts are **supplementary** context from the brand’s knowledge index. "
            f"They may be irrelevant or incomplete for this question.\n\n"
            f"{context_block}\n\n"
            f"If the customer needs **live store data** (order status, tracking, inventory, catalog SKUs/prices, "
            f"or purchase history for this merchant), you **must** use the enabled Shopify tools first—those facts "
            f"are not in the excerpts.\n"
            f"Use the fallback message below **only** when neither the tools (after you call them) nor the excerpts "
            f"support a concrete answer, or the question is general chitchat.\n"
            f"{fallback_message}\n\n"
            f"Customer message:\n{user_message}"
        )
    return (
        f"The following excerpts are the best-matching passages from the brand’s knowledge index. "
        f"Answer the customer’s question using them.\n\n"
        f"{context_block}\n\n"
        f"If those excerpts do not contain a concrete answer, use this fallback message:\n"
        f"{fallback_message}\n\n"
        f"Customer message:\n{user_message}"
    )
