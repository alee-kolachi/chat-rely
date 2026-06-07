"""Tests for product carousel reply shortening."""

from app.agent.product_cards import (
    brief_product_search_intro,
    is_catalog_browse_question,
    is_product_browse_turn,
    is_specific_product_availability_question,
    shorten_answer_for_product_cards,
)


def test_is_product_browse_turn_price_question() -> None:
    assert is_product_browse_turn("what is the price of hydrogen snowboard?") is False
    assert is_product_browse_turn("do you sell boots?") is True


def test_is_product_browse_turn_assistant_capability_question() -> None:
    assert is_product_browse_turn("what do you do? what do you do?") is False
    assert is_product_browse_turn("who are you") is False


def test_is_catalog_browse_question() -> None:
    assert is_catalog_browse_question("what products do you sell?") is True
    assert is_catalog_browse_question("do you sell laptops?") is False


def test_is_specific_product_availability_question() -> None:
    assert is_specific_product_availability_question("do you sell laptops?") is True
    assert is_specific_product_availability_question("what products do you sell?") is False


def test_brief_product_search_intro_catalog_question() -> None:
    intro = brief_product_search_intro("what products do you sell?", count=3)
    assert "variety" in intro.lower() or "highlights" in intro.lower()


def test_brief_product_search_intro_boots() -> None:
    intro = brief_product_search_intro("do you sell boots too?", count=2)
    assert "boot" in intro.lower()


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
