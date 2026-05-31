"""First-message copy for the embed widget (custom greeting or agent-name default)."""

from typing import Any


def default_welcome_message(agent_name: str | None) -> str:
    name = (agent_name or "").strip() or "Support"
    return f"Hi! I'm {name}. How can I help?"


def resolve_welcome_message(agent_name: str | None, behavior: dict[str, Any] | None) -> str:
    b = behavior if isinstance(behavior, dict) else {}
    raw = b.get("greeting_message")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    return default_welcome_message(agent_name)
