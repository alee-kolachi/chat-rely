from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MessageFeedbackVoteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message_id: UUID
    value: Literal[-1, 1]
    """When set (e.g. playground thread visitor), stored as this visitor_id; else owner-scoped id."""
    visitor_id: str | None = Field(default=None, max_length=255)


class PublicMessageFeedbackRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message_id: UUID
    visitor_id: str = Field(min_length=1, max_length=255)
    value: Literal[-1, 1]


class MessageFeedbackResolveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message_id: UUID
    resolved: bool = True
    note: str | None = Field(default=None, max_length=2000)


class MessageFeedbackListItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message_id: UUID
    conversation_id: UUID
    content_preview: str
    visitor_id: str
    feedback_at: datetime
    resolved_at: datetime | None = None


class MessageFeedbackAnalyticsDTO(BaseModel):
    model_config = ConfigDict(extra="forbid")

    thumbs_up_count: int = 0
    thumbs_down_unresolved_count: int = 0
    thumbs_down_resolved_count: int = 0
    unresolved_items: list[MessageFeedbackListItem] = Field(default_factory=list)
    resolved_items: list[MessageFeedbackListItem] = Field(default_factory=list)
    summary: str | None = None
    topics: list[str] = Field(default_factory=list)
    latest_batch_index: int | None = None
    playground_included: bool = False
