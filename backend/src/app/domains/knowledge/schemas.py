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
    status: str | None = Field(
        default=None,
        description="When set (e.g. skipped_duplicate), overrides the DB default pending.",
    )


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
    phase: str = "queued"
    pages_total: int = 0
    pages_processed: int = 0
    chunks_total: int = 0
    chunks_embedded: int = 0
    progress_pct: int = 0
    metrics: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class IndexJobListResponse(BaseModel):
    jobs: list[IndexJobDTO]


class SourceIndexResponse(BaseModel):
    source: KnowledgeSourceDTO
    job: IndexJobDTO


WebsitePathOperator = Literal["starts_with", "ends_with", "contains", "exact_match", "wildcard"]
WebsiteMode = Literal["crawl", "sitemap", "individual"]


class WebsitePathRule(BaseModel):
    model_config = ConfigDict(extra="forbid")

    operator: WebsitePathOperator
    pattern: str = Field(min_length=1, max_length=2048)


class WebsiteIngestBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    agent_id: UUID
    protocol: Literal["https://", "http://"] = "https://"
    url_input: str = Field(min_length=1, max_length=2048)
    title: str | None = Field(default=None, max_length=255)
    include_rules: list[WebsitePathRule] = Field(default_factory=list)
    exclude_rules: list[WebsitePathRule] = Field(default_factory=list)


class WebsiteCrawlRequest(WebsiteIngestBase):
    pass


class WebsiteSitemapRequest(WebsiteIngestBase):
    pass


class WebsiteIndividualRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    agent_id: UUID
    protocol: Literal["https://", "http://"] = "https://"
    url_input: str = Field(min_length=1, max_length=2048)
    title: str | None = Field(default=None, max_length=255)


class WebsiteIngestResponse(BaseModel):
    source: KnowledgeSourceDTO
    """Omitted when the source was skipped as a duplicate (no indexing job created)."""
    job: IndexJobDTO | None = None


class WebsiteSourceListItemDTO(BaseModel):
    id: UUID
    agent_id: UUID
    title: str
    source_url: str | None
    status: str
    website_mode: WebsiteMode | None = None
    link_count: int = 0
    last_indexed_at: datetime | None = None
    latest_job_status: str | None = None
    latest_job_phase: str | None = None
    job_pages_total: int | None = None
    job_pages_processed: int | None = None
    job_progress_pct: int | None = None
    job_crawl_limit_exceeded: bool = False


class WebsiteSourcesListResponse(BaseModel):
    sources: list[WebsiteSourceListItemDTO]


class WebsiteSourcePageItemDTO(BaseModel):
    url: str
    status: str
    depth: int
    last_indexed_at: datetime | None = None
    http_status: int | None = None


class WebsiteSourcePagesResponse(BaseModel):
    pages: list[WebsiteSourcePageItemDTO]
    total: int
    offset: int
    limit: int


class WebsiteUsageResponse(BaseModel):
    plan_slug: str
    plan_name: str
    included_storage_bytes: int
    used_storage_bytes: int
    total_links: int
    show_upgrade: bool
    website_crawl_budget_bytes: int = 0
    website_crawl_last_job_bytes: int | None = None

