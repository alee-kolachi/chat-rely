from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ConversationDTO(BaseModel):
    id: UUID
    agent_id: UUID
    user_id: UUID
    visitor_id: str
    channel: str
    status: str
    started_at: datetime
    last_activity_at: datetime
    closed_at: datetime | None
    customer_message_count: int
    assistant_message_count: int
    tool_call_count: int
    total_input_tokens: int
    total_output_tokens: int
    counts_toward_plan: bool
    metadata: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class MessageDTO(BaseModel):
    id: UUID
    conversation_id: UUID
    agent_id: UUID
    user_id: UUID
    role: str
    content: str
    tool_name: str | None
    tool_call_id: str | None
    tool_call_payload: dict[str, Any]
    tool_result_payload: dict[str, Any]
    model: str | None
    input_tokens: int
    output_tokens: int
    latency_ms: int | None
    metadata: dict[str, Any]
    created_at: datetime


class ConversationListResponse(BaseModel):
    conversations: list[ConversationDTO]


class ConversationDetailResponse(BaseModel):
    conversation: ConversationDTO
    messages: list[MessageDTO]


class ConversationMessageCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: str = Field(pattern="^(user|assistant|system|tool)$")
    content: str = Field(min_length=1)
    tool_name: str | None = None
    tool_call_id: str | None = None
    tool_call_payload: dict[str, Any] | None = None
    tool_result_payload: dict[str, Any] | None = None
    model: str | None = None
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: int | None = None
    metadata: dict[str, Any] | None = None


class ConversationUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str = Field(pattern="^(open|idle_closed|resolved|escalated)$")

