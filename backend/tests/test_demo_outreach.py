"""Tests for demo outreach helpers."""

from app.domains.demo.constants import DEMO_PUBLIC_BASE_URL
from app.domains.demo.demo_product_cards import demo_cards_for_turn, product_dict_to_card
from app.domains.demo.qa_judge import build_qa_questions
from app.domains.demo.repository import build_demo_slug, demo_public_url
from app.domains.demo.storefront_ingest import build_suggested_prompts, product_to_index_text
from tests.demo_fixtures import normalized_sample_product, sample_shopify_product


def test_normalize_product_maps_shopify_json() -> None:
    product = normalized_sample_product()
    assert product.handle == "classic-hoodie"
    assert product.title == "Classic Hoodie"
    assert product.min_price == "48.00"
    assert product.url.endswith("/products/classic-hoodie")


def test_product_dict_to_card_shape() -> None:
    product = normalized_sample_product().model_dump()
    card = product_dict_to_card(product)
    assert card is not None
    assert card["handle"] == "classic-hoodie"
    assert card["price"] == "$48.00"


def test_demo_cards_for_product_question() -> None:
    products = [normalized_sample_product().model_dump()]
    cards = demo_cards_for_turn(products, "Do you have the Classic Hoodie?")
    assert len(cards) >= 1
    assert cards[0]["title"] == "Classic Hoodie"


def test_build_top_products_from_catalog() -> None:
    from app.domains.demo.service import build_top_products

    products = [normalized_sample_product().model_dump()]
    top = build_top_products(products)
    assert len(top) == 1
    assert top[0].title == "Classic Hoodie"
    assert top[0].price == "$48.00"


def test_build_suggested_prompts() -> None:
    product = normalized_sample_product()
    prompts = build_suggested_prompts([product], {"refund": "30 day returns"})
    assert any("Classic Hoodie" in p for p in prompts)
    assert any("return" in p.lower() for p in prompts)


def test_build_qa_questions_includes_negative_probe() -> None:
    products = [normalized_sample_product().model_dump()]
    questions = build_qa_questions(products, {"refund": "30 days"})
    categories = {q["category"] for q in questions}
    assert "negative_probe" in categories
    assert "out_of_scope" in categories


def test_demo_public_url_uses_fixed_base() -> None:
    url = demo_public_url("acme-x1y2z3")
    assert url == f"{DEMO_PUBLIC_BASE_URL}/demo/acme-x1y2z3"


def test_build_demo_slug_contains_name() -> None:
    slug = build_demo_slug("Acme Store")
    assert slug.startswith("acme-store-")


def test_qa_routing_threshold() -> None:
    from app.domains.demo.constants import DEMO_QA_SCORE_THRESHOLD

    scores = [0.9, 0.85, 0.8]
    avg = sum(scores) / len(scores)
    assert avg >= DEMO_QA_SCORE_THRESHOLD
    low = [0.5, 0.6]
    assert sum(low) / len(low) < DEMO_QA_SCORE_THRESHOLD


def test_is_generic_logo_url_filters_shopify_proxy() -> None:
    from app.domains.demo.store_branding import is_generic_logo_url

    assert is_generic_logo_url("https://www.google.com/s2/favicons?domain=shopify.com&sz=128")
    assert not is_generic_logo_url("https://cdn.example.com/logo.png")


def test_pick_store_logo_prefers_header_logo() -> None:
    from bs4 import BeautifulSoup

    from app.domains.demo.store_branding import pick_store_logo_url

    html = """
    <html><head><link rel="icon" href="/favicon.ico"></head>
    <body><img class="header__heading-logo" src="/files/logo.png" alt="Acme logo"></body></html>
    """
    soup = BeautifulSoup(html, "lxml")
    logo = pick_store_logo_url(
        soup=soup,
        base_url="https://store.example.com",
        social_preview_url="https://store.example.com/hero.jpg",
    )
    assert logo == "https://store.example.com/files/logo.png"


def test_pick_brand_color_from_theme_meta() -> None:
    from bs4 import BeautifulSoup

    from app.domains.demo.store_branding import pick_brand_color

    html = '<html><head><meta name="theme-color" content="#112233"></head></html>'
    soup = BeautifulSoup(html, "lxml")
    assert pick_brand_color(soup=soup, html_text=html) == "#112233"
