from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PublicWidgetAgentContext(BaseModel):
    """Resolved merchant scope for a browser-embeddable widget (via agent public_key)."""

    model_config = ConfigDict(extra="forbid")

    agent_id: UUID
    user_id: UUID
    name: str
    behavior_settings: dict[str, Any]


class PublicWidgetConfigResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    agent_id: UUID
    name: str
    brand_color: str | None = None
    widget_position: Literal["bottom_right", "bottom_left"] = "bottom_right"
    """Optional first assistant bubble shown when the chat opens."""
    greeting_message: str | None = None
    """True when ``human.escalate`` is enabled for this agent (widget may show Escalate button)."""
    human_escalation_available: bool = False
    """Optional logo URL for header (e.g. favicon from primary website knowledge source)."""
    avatar_url: str | None = None


class PublicWidgetChatRequest(BaseModel):
    """Visitor chat — agent is implied by ``X-ChatRely-Agent-Key`` (no overrides)."""

    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1)
    conversation_id: UUID | None = None
    visitor_id: str = Field(min_length=1, max_length=255)
    visitor_email: str | None = None
    request_human: bool = False
    locale: str | None = None
    country_code: str | None = None
