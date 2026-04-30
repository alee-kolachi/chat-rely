def build_grounded_user_prompt(context_block: str, fallback_message: str, user_message: str) -> str:
    return (
        f"Knowledge context:\n{context_block}\n\n"
        f"Fallback message:\n{fallback_message}\n\n"
        f"User question:\n{user_message}"
    )
