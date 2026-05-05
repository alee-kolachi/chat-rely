from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class ProfileDTO(BaseModel):
    id: UUID
    full_name: str | None
    avatar_url: str | None
    timezone: str
    email_notifications_enabled: bool
    created_at: datetime
    updated_at: datetime


class PlanDTO(BaseModel):
    id: UUID
    slug: str
    name: str
    monthly_price_cents: int = 0
    included_conversations: int
    max_agents: int
    overage_conversation_cents: int
    features: dict[str, Any]


class SubscriptionDTO(BaseModel):
    id: UUID
    user_id: UUID
    plan_id: UUID
    status: str
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    provider_customer_id: str | None = None
    provider_subscription_id: str | None = None


class UsageSnapshotDTO(BaseModel):
    period_start: date
    period_end: date
    included_conversations: int
    billable_conversations: int
    overage_conversations: int
    estimated_overage_cents: int
    throttle_tier: str
    cushion_limit_conversations: int = 0
    conversations_in_free_cushion: int = 0


class BootstrapResponse(BaseModel):
    profile: ProfileDTO
    subscription: SubscriptionDTO
    plan: PlanDTO


class MeContextResponse(BaseModel):
    profile: ProfileDTO
    subscription: SubscriptionDTO
    plan: PlanDTO
    usage_snapshot: UsageSnapshotDTO | None

