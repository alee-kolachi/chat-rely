def build_system_prompt(system_prompt: str) -> str:
    return (
        system_prompt.strip()
        + "\n\nYou must answer strictly from the provided knowledge context. "
        "If context is insufficient, respond with the fallback exactly."
    )
