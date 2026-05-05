"""Pure helpers for plan cushion / paid overage (mirrors public.refresh_usage_period_snapshot)."""

from __future__ import annotations

import math


def cushion_conversation_limit(included: int) -> int:
    """ceil(included * 1.2), minimum 0."""
    if included <= 0:
        return 0
    return max(int(math.ceil(included * 1.2)), 0)


def paid_overage_conversations(billable: int, included: int) -> int:
    """Billable conversations above the cushion (charged at plan overage rate)."""
    return max(0, billable - cushion_conversation_limit(included))
