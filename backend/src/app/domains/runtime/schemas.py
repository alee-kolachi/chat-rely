from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RuntimeChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    agent_id: UUID
    message: str = Field(min_length=1)
    conversation_id: UUID | None = None
    visitor_id: str = Field(default="preview-user", min_length=1, max_length=255)
    model_override: str | None = None
    system_prompt_override: str | None = None


class RuntimeChatResponse(BaseModel):
    conversation_id: UUID
    assistant_message_id: UUID
    response: str
    model: str
    fallback_used: bool
    retrieval_count: int
    min_similarity: float
    created_at: datetime
    retrieval_preview: list[dict[str, Any]]

