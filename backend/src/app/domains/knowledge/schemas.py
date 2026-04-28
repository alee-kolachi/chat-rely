from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

KnowledgeSourceType = Literal["website", "file"]


class KnowledgeSourceCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    agent_id: UUID
    type: KnowledgeSourceType
    title: str = Field(min_length=1, max_length=255)
    source_url: str | None = None
    storage_bucket: str | None = None
    storage_path: str | None = None
    metadata: dict[str, Any] | None = None


class KnowledgeSourceDTO(BaseModel):
    id: UUID
    agent_id: UUID
    user_id: UUID
    type: str
    title: str
    status: str
    source_url: str | None
    storage_bucket: str | None
    storage_path: str | None
    metadata: dict[str, Any]
    error_message: str | None
    last_indexed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class KnowledgeSourceListResponse(BaseModel):
    sources: list[KnowledgeSourceDTO]


class IndexJobDTO(BaseModel):
    id: UUID
    knowledge_source_id: UUID
    agent_id: UUID
    user_id: UUID
    status: str
    attempt: int
    triggered_by: str
    error_message: str | None
    started_at: datetime | None
    finished_at: datetime | None
    metrics: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class IndexJobListResponse(BaseModel):
    jobs: list[IndexJobDTO]


class SourceIndexResponse(BaseModel):
    source: KnowledgeSourceDTO
    job: IndexJobDTO

