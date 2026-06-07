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
    assert shorten_answer_for_product_cards(raw) == "We have boots:"


def test_shorten_answer_for_product_cards_keeps_price_with_markdown_link() -> None:
    raw = (
        "The Videographer Snowboard is priced at $885.95. "
        "You can view more details or purchase it [here](https://example.com/products/videographer)."
    )
    assert shorten_answer_for_product_cards(raw) == raw


def test_shorten_answer_for_product_cards_keeps_intro_before_numbered_list() -> None:
    raw = (
        "We have several snowboards available. Here are a few options:\n\n"
        "1. **[The Minimal Snowboard](https://example.com)** - $885.95"
    )
    assert (
        shorten_answer_for_product_cards(raw)
        == "We have several snowboards available. Here are a few options:"
    )
