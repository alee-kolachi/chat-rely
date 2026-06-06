"""First-message copy for the embed widget (custom greeting or agent-name default)."""

from typing import Any


def default_welcome_messages(agent_name: str | None) -> list[str]:
    name = (agent_name or "").strip() or "Support"
    return [
        f"Hey there! I'm {name}, your support assistant. Let's find the best match for you.",
        "Can I get your name and what you're looking for today?",
    ]


def default_welcome_message(agent_name: str | None) -> str:
    return default_welcome_messages(agent_name)[0]


def _stored_greeting_messages(behavior: dict[str, Any]) -> list[str]:
    raw_list = behavior.get("greeting_messages")
    if isinstance(raw_list, list):
        msgs = [str(item).strip() for item in raw_list if isinstance(item, str) and str(item).strip()]
        if msgs:
            return msgs[:2]
    raw = behavior.get("greeting_message")
    if isinstance(raw, str) and raw.strip():
        return [raw.strip()]
    return []


def resolve_welcome_messages(agent_name: str | None, behavior: dict[str, Any] | None) -> list[str]:
    b = behavior if isinstance(behavior, dict) else {}
    stored = _stored_greeting_messages(b)
    if stored:
        return stored
    return default_welcome_messages(agent_name)


def resolve_welcome_message(agent_name: str | None, behavior: dict[str, Any] | None) -> str:
    messages = resolve_welcome_messages(agent_name, behavior)
    return messages[0] if messages else ""
