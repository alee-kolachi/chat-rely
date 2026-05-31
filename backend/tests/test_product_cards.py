"""Tests for product carousel reply shortening."""

from app.agent.product_cards import shorten_answer_for_product_cards


def test_shorten_answer_for_product_cards_keeps_short_intro() -> None:
    assert (
        shorten_answer_for_product_cards("Here are a few boot options:")
        == "Here are a few boot options:"
    )


def test_shorten_answer_for_product_cards_strips_markdown_list() -> None:
    raw = (
        "We have boots:\n\n"
        "**Timberland Boot** - Price: $299\n"
        "**Dr Martens** - Price: $249"
    )
    assert shorten_answer_for_product_cards(raw) == "Here are a few options:"
