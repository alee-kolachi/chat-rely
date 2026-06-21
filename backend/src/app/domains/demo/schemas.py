from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class DemoProductSnapshot(BaseModel):
    shopify_product_id: int | None = None
    handle: str
    title: str
    url: str
    image_url: str | None = None
    min_price: str | None = None
    max_price: str | None = None
    currency: str = "USD"
    vendor: str | None = None
    product_type: str | None = None
    tags: list[str] = Field(default_factory=list)
    options: list[dict[str, Any]] = Field(default_factory=list)
    variants: list[dict[str, Any]] = Field(default_factory=list)
    description_excerpt: str | None = None


class DemoTopProduct(BaseModel):
    handle: str
    title: str
    url: str
    image_url: str | None = None
    price: str | None = None


class DemoOutreachDTO(BaseModel):
    agent_id: UUID
    slug: str
    store_url: str
    store_host: str
    status: str
    display_name: str | None = None
    logo_url: str | None = None
    brand_color: str | None = None
    product_count: int = 0
    suggested_prompts: list[str] = Field(default_factory=list)
    sheet_ref: dict[str, Any] = Field(default_factory=dict)
    sheet_snapshot: dict[str, Any] = Field(default_factory=dict)
    qa_report: dict[str, Any] = Field(default_factory=dict)
    lifetime_message_count: int = 0
    ready_at: datetime | None = None
    expires_at: datetime | None = None
    created_at: datetime


class DemoPublicConfigResponse(BaseModel):
    slug: str
    status: str
    display_name: str
    logo_url: str | None = None
    store_url: str
    product_count: int
    suggested_prompts: list[str]
    top_products: list[DemoTopProduct] = Field(default_factory=list)
    brand_color: str | None = None
    install_url: str
    demo_limitation_line: str
    chat_available: bool
    limit_message: str | None = None


class DemoChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: UUID | None = None
    visitor_id: str = Field(min_length=1, max_length=128)


class DemoJudgeResult(BaseModel):
    grounded: bool
    accurate: bool
    hallucinated: bool
    score: float
    reason: str
