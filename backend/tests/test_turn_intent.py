"""Tests for per-turn store vs conversational intent."""

import pytest

from app.agent.product_cards import is_product_browse_turn, is_product_show_request
from app.agent.turn_intent import (
    message_references_thread_catalog,
    route_turn_intent_sync,
    turn_wants_store_data,
)


def test_turn_wants_store_data_catalog_questions() -> None:
    assert turn_wants_store_data("what do you sell") is True
    assert turn_wants_store_data("do you sell boots?") is True
    assert turn_wants_store_data("show me snowboards") is True
    assert turn_wants_store_data("give me cheapest one") is True
    assert turn_wants_store_data("what is the average price") is True


def test_turn_wants_store_data_conversational_resets() -> None:
    assert turn_wants_store_data("hello") is False
    assert turn_wants_store_data("Hello!") is False
    assert turn_wants_store_data("thanks") is False
    assert turn_wants_store_data("ok got it") is False
    assert turn_wants_store_data("boots") is True


def test_is_product_show_request() -> None:
    assert is_product_show_request("show me snowboards") is True
    assert is_product_browse_turn("show me snowboards") is True
    assert is_product_browse_turn("hello") is False


def test_message_references_thread_catalog() -> None:
    assert message_references_thread_catalog("give me that one") is True
    assert message_references_thread_catalog("hello") is False


def test_route_turn_intent_direct() -> None:
    assert route_turn_intent_sync("hello").route == "direct"
    assert route_turn_intent_sync("thanks!").route == "direct"


def test_route_turn_intent_rag() -> None:
    assert route_turn_intent_sync("What's your return policy?").route == "rag"


def test_route_turn_intent_products() -> None:
    assert route_turn_intent_sync("what do you sell").route == "products"
    assert route_turn_intent_sync("do you sell boots?").route == "products"
    assert route_turn_intent_sync(
        "What sizes does the Camicia da bowling come in?"
    ).route == "products"
    assert route_turn_intent_sync("do you refund after purchase?").route == "rag"


@pytest.mark.asyncio
async def test_route_turn_intent_async() -> None:
    from app.agent.turn_intent import route_turn_intent

    decision = await route_turn_intent("hello")
    assert decision.route == "direct"
