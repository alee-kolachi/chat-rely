from typing import Any

from pydantic import BaseModel


class PublicPlanDTO(BaseModel):
    slug: str
    name: str
    monthly_price_cents: int
    included_conversations: int
    overage_conversation_cents: int
    max_agents: int
    features: dict[str, Any]
    throttle_policy: dict[str, Any]
    sort_order: int
