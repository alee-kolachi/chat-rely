from app.domains.usage_cushion import cushion_conversation_limit, paid_overage_conversations


def test_cushion_limit_rounds_up() -> None:
    assert cushion_conversation_limit(500) == 600
    assert cushion_conversation_limit(50) == 60
    assert cushion_conversation_limit(0) == 0


def test_paid_overage_only_beyond_cushion() -> None:
    included = 500
    assert paid_overage_conversations(500, included) == 0
    assert paid_overage_conversations(600, included) == 0
    assert paid_overage_conversations(601, included) == 1
