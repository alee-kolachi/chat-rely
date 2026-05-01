def build_grounded_user_prompt(context_block: str, fallback_message: str, user_message: str) -> str:
    return (
        f"The following excerpts are the best-matching passages from the brand’s knowledge index. "
        f"Answer the customer’s question using them.\n\n"
        f"{context_block}\n\n"
        f"If those excerpts do not contain a concrete answer, use this fallback message:\n"
        f"{fallback_message}\n\n"
        f"Customer message:\n{user_message}"
    )
