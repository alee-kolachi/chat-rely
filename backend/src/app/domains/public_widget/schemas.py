from datetime import datetime
from typing import Any, Literal, Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.domains.public_widget.appearance import PublicWidgetAppearance
from app.domains.runtime.schemas import ProductActionRequest, ensure_non_whitespace_message


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
    """First assistant bubble when the chat opens (legacy single-bubble clients)."""
    greeting_message: str | None = None
    """Ordered welcome bubbles; custom greeting is one item, default is two."""
    greeting_messages: list[str] | None = None
    welcome_screen_enabled: bool = True
    welcome_screen_headline: str | None = None
    welcome_screen_headline_color: str | None = None
    welcome_screen_description: str | None = None
    welcome_screen_button_label: str | None = None
    welcome_screen_social_links: list[dict[str, str]] | None = None
    """True when ``human.escalate`` is enabled for this agent (widget may show Escalate button)."""
    human_escalation_available: bool = False
    """Optional logo URL for header (e.g. favicon from primary website knowledge source)."""
    avatar_url: str | None = None
    """When True, widget may show a visitor attachment affordance. Disabled until uploads ship (marketing: Coming soon)."""
    attachments_ui_enabled: bool = False
    hide_powered_by_chatrely: bool = Field(
        default=False,
        description=(
            "When True, omit “Powered by ChatRely” in the embed (Pro and legacy Scale). "
            "When False, the widget may show it only until the visitor sends their first message."
        ),
    )
    message_feedback_enabled: bool = Field(
        default=False,
        description="When True, embed may show thumbs up/down on assistant replies (Pro / Scale).",
    )
    """Pro-only: theme mode, font, granular colors. Omitted for non-Pro plans."""
    widget_appearance: PublicWidgetAppearance | None = None


class PublicWidgetChatRequest(BaseModel):
    """Visitor chat — agent is implied by ``X-ChatRely-Agent-Key`` (no overrides)."""

    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1, max_length=8000)
    conversation_id: UUID | None = None
    visitor_id: str = Field(min_length=1, max_length=255)
    visitor_email: str | None = None
    visitor_name: str | None = None
    request_human: bool = False
    locale: str | None = None
    country_code: str | None = None
    product_action: ProductActionRequest | None = None

    @field_validator("message")
    @classmethod
    def _message_not_whitespace_only(cls, value: str) -> str:
        return ensure_non_whitespace_message(value)


class PublicWidgetMessageFeedbackRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message_id: UUID
    visitor_id: str = Field(min_length=1, max_length=255)
    remove: bool = False
    value: Literal[-1, 1] | None = None

    @model_validator(mode="after")
    def _value_or_remove(self) -> Self:
        if self.remove:
            return self
        if self.value is None:
            raise ValueError("value is required when remove is false")
        return self


class PublicWidgetVisitorContactRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    conversation_id: UUID
    visitor_id: str = Field(min_length=1, max_length=255)
    visitor_name: str = Field(min_length=1, max_length=200)
    visitor_email: str = Field(min_length=3, max_length=320)


class EscalationHandoffFields(BaseModel):
    model_config = ConfigDict(extra="forbid")

    seller_live: bool = False
    estimated_minutes: int | None = None
    channel_hint: Literal["live", "email"] | None = None


class PublicWidgetVisitorContactResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    handoff_message: str
    conversation_status: str
    contact_capture_required: bool = False
    seller_live: bool = False
    estimated_minutes: int | None = None
    channel_hint: Literal["live", "email"] | None = None


class PublicWidgetPresenceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    conversation_id: UUID
    visitor_id: str = Field(min_length=1, max_length=255)


class PublicWidgetThreadRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    conversation_id: UUID
    visitor_id: str = Field(min_length=1, max_length=255)
    since: datetime | None = None


class PublicWidgetThreadMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime


class PublicWidgetThreadResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    conversation_status: str
    ai_chat_disabled: bool = False
    operator_engaged: bool = False
    conversation_active: bool = False
    visitor_online: bool = False
    handoff_banner: str | None = None
    handoff: EscalationHandoffFields | None = None
    messages: list[PublicWidgetThreadMessage] = Field(default_factory=list)


class PublicWidgetVisitorMessageRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    conversation_id: UUID
    visitor_id: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1, max_length=8000)

    @field_validator("message")
    @classmethod
    def _message_not_whitespace_only(cls, value: str) -> str:
        return ensure_non_whitespace_message(value)
