from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TicketDTO(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    user_id: UUID
    agent_id: UUID
    conversation_id: UUID
    status: str
    subject: str | None
    priority: str
    customer_email: str | None
    external_provider: str | None
    external_id: str | None
    metadata: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    conversation_status: str | None = None
    conversation_active: bool = False
    visitor_online: bool = False


class TicketListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tickets: list[TicketDTO]
    total: int


class TicketDetailResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ticket: TicketDTO
