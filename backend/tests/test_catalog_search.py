"""Tests for shared catalog search token extraction and browse intros."""

import json

from app.agent.catalog_search import (
    catalog_browse_carousel_intro,
    catalog_search_tokens,
)
from app.domains.demo.demo_catalog_tool_runners import run_demo_product_search
from app.domains.demo.demo_product_cards import search_demo_products


def test_catalog_search_tokens_drop_products_noise() -> None:
    assert catalog_search_tokens("what women products do you sell?") == ["women"]
    assert catalog_search_tokens("what do you sell?") == []


def test_search_women_products_finds_tagged_items() -> None:
    products = [
        {
            "title": "Pleated Skirt",
            "handle": "pleated-skirt",
            "url": "https://store.example.com/products/pleated-skirt",
            "tags": ["Women", "Skirts"],
            "min_price": "4799.20",
            "currency": "PKR",
        },
        {
            "title": "Duffle Bag",
            "handle": "duffle-bag",
            "url": "https://store.example.com/products/duffle-bag",
            "tags": ["Bags"],
            "min_price": "6399.20",
            "currency": "PKR",
        },
    ]
    cards = search_demo_products(
        products,
        "what women products do you sell?",
        max_results=5,
        min_score=1,
    )
    assert cards
    assert cards[0]["handle"] == "pleated-skirt"


def test_demo_product_search_women_query_not_empty_after_relevance_filter() -> None:
    products = [
        {
            "title": "Jasmine Jumpsuit Multi",
            "handle": "jasmine-jumpsuit",
            "url": "https://store.example.com/products/jasmine-jumpsuit",
            "tags": ["Women"],
            "min_price": "1516.00",
            "currency": "PKR",
        },
        {
            "title": "Men's Oxford Shirt",
            "handle": "oxford-shirt",
            "url": "https://store.example.com/products/oxford-shirt",
            "tags": ["Men"],
            "min_price": "2500.00",
            "currency": "PKR",
        },
    ]
    raw = run_demo_product_search(
        products,
        query="women",
        max_results=5,
        relevance_query="what women products do you sell?",
    )
    payload = json.loads(raw)
    assert payload["lookup_meta"]["not_found"] is False
    handles = {card["handle"] for card in payload.get("ui_cards") or []}
    assert "jasmine-jumpsuit" in handles
    assert "oxford-shirt" not in handles


def test_catalog_browse_carousel_intro_shortens_overview() -> None:
    overview = (
        "We carry 120 products across 8 categories, including Dresses (24), "
        "Bags (18), Shoes (15), and 5 more. Here are a few examples:"
    )
    intro = catalog_browse_carousel_intro(
        overview=overview,
        user_message="what do you sell?",
        count=5,
    )
    assert intro.endswith(".")
    assert "here are" not in intro.casefold()
    assert len(intro) <= 220
