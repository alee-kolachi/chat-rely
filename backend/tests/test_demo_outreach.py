"""Tests for demo outreach helpers."""

from app.domains.demo.constants import DEMO_PUBLIC_BASE_URL
from app.domains.demo.demo_product_cards import demo_cards_for_turn, product_dict_to_card, product_dict_to_detail
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
    assert len(product.image_urls) == 2


def test_product_dict_to_detail_includes_rich_fields() -> None:
    product = normalized_sample_product().model_dump()
    detail = product_dict_to_detail(product)
    assert detail is not None
    assert detail["handle"] == "classic-hoodie"
    assert len(detail["image_urls"]) == 2
    assert detail["description"] == "Soft cotton hoodie."
    assert detail["description_points"] == ["Soft cotton hoodie."]
    assert detail["vendor"] == "Acme"
    assert detail["sku"] == "HD-S"
    assert detail["options"][0]["name"] == "Size"


def test_apply_product_detail_presentation_updates_bullets() -> None:
    from app.domains.demo.demo_product_detail_presenter import (
        PolishedProductOption,
        ProductDetailPresentation,
        apply_product_detail_presentation,
    )

    detail = {"title": "Hoodie", "description": "Soft cotton hoodie."}
    polished = ProductDetailPresentation(
        description_points=["Soft cotton hoodie"],
        options=[PolishedProductOption(name="Size", values=["S", "M", "L"])],
    )
    out = apply_product_detail_presentation(detail, polished)
    assert out["description_points"] == ["Soft cotton hoodie"]
    assert "description" not in out
    assert out["options"][0]["values"] == ["S", "M", "L"]


def test_summarize_demo_catalog_uses_snapshot_tags() -> None:
    from app.domains.demo.demo_catalog_overview import summarize_demo_catalog

    products = [
        {
            "title": "Brown Leather Wallet (W-276)",
            "handle": "brown-wallet",
            "url": "https://store.example.com/products/brown-wallet",
            "tags": ["Wallets"],
            "min_price": "1499.00",
            "currency": "PKR",
        },
        {
            "title": "GOOD VIBES (80 mL)",
            "handle": "good-vibes",
            "url": "https://store.example.com/products/good-vibes",
            "tags": ["Fragrance"],
            "min_price": "2999.00",
            "currency": "PKR",
        },
        {
            "title": "Black Graphic T-Shirt (GT-1)",
            "handle": "black-graphic-tee",
            "url": "https://store.example.com/products/black-graphic-tee",
            "tags": ["T-Shirts"],
            "min_price": "1999.00",
            "currency": "PKR",
        },
    ]
    summary = summarize_demo_catalog(products)
    assert summary["product_count"] == 3
    assert len(summary["categories"]) >= 2
    assert "3 products" not in summary["overview"]
    assert "Wallets" in summary["overview"] or "wallets" in summary["overview"].casefold()


def test_broad_catalog_search_returns_overview_and_sample_cards() -> None:
    import json

    from app.domains.demo.demo_catalog_tool_runners import run_demo_product_search

    products = [
        {
            "title": f"Product {index}",
            "handle": f"product-{index}",
            "url": f"https://store.example.com/products/product-{index}",
            "tags": ["Wallets" if index % 2 == 0 else "Fragrance"],
            "min_price": "1000.00",
            "currency": "PKR",
        }
        for index in range(20)
    ]
    raw = run_demo_product_search(
        products,
        query="what do you sell?",
        max_results=5,
        relevance_query="what do you sell?",
    )
    payload = json.loads(raw)
    meta = payload["lookup_meta"]
    assert meta.get("is_broad_catalog") is True
    assert meta.get("catalog_product_count") == 20
    assert isinstance(meta.get("catalog_overview"), str)
    cards = payload.get("ui_cards") or []
    assert len(cards) == 5
    handles = {card["handle"] for card in cards}
    assert handles != {f"product-{i}" for i in range(5)}


def test_rank_demo_products_matches_category_synonyms() -> None:
    from app.domains.demo.demo_catalog_grounding import rank_demo_products
    from app.domains.demo.demo_product_cards import search_demo_products

    products = [
        {
            "title": "Black Graphic Half Sleeves Men's T-Shirt (GT-1)",
            "handle": "black-graphic-tee",
            "url": "https://store.example.com/products/black-graphic-tee",
            "tags": ["T-Shirts"],
            "min_price": "1999.00",
            "currency": "PKR",
        },
        {
            "title": "Brown Leather Wallet (W-276)",
            "handle": "brown-wallet",
            "url": "https://store.example.com/products/brown-wallet",
            "tags": ["Wallets"],
            "min_price": "1499.00",
            "currency": "PKR",
        },
        {
            "title": "GOOD VIBES (80 mL)",
            "handle": "good-vibes",
            "url": "https://store.example.com/products/good-vibes",
            "tags": ["Fragrance"],
            "min_price": "2999.00",
            "currency": "PKR",
        },
    ]
    graphic_cards = search_demo_products(products, "do you sell graphic tshirt?", max_results=1)
    assert graphic_cards and "graphic" in graphic_cards[0]["title"].casefold()
    wallet_cards = search_demo_products(products, "do you sell wallets?", max_results=1)
    assert wallet_cards and "wallet" in wallet_cards[0]["title"].casefold()
    fragrance_cards = search_demo_products(products, "do you sell fragrance?", max_results=1)
    assert fragrance_cards and fragrance_cards[0]["handle"] == "good-vibes"
    ranked = rank_demo_products(products, "graphic tshirt")
    assert ranked[0][1]["handle"] == "black-graphic-tee"


def test_product_dict_to_card_shape() -> None:
    product = normalized_sample_product().model_dump()
    card = product_dict_to_card(product)
    assert card is not None
    assert card["handle"] == "classic-hoodie"
    assert card["price"] == "$48.00"


def test_rank_demo_products_prefers_full_title_match() -> None:
    from app.domains.demo.demo_catalog_grounding import rank_demo_products

    products = [
        {
            "title": "Bayberry Swim Trunk - Island Blue Leaves",
            "handle": "bayberry-swim-trunk-island-blue",
            "url": "https://store.example.com/products/bayberry-swim-trunk-island-blue",
            "min_price": "88.00",
            "currency": "USD",
        },
        {
            "title": "Anchor Swim Short - Bay Blue",
            "handle": "anchor-swim-short-bay-blue",
            "url": "https://store.example.com/products/anchor-swim-short-bay-blue",
            "min_price": "88.00",
            "currency": "USD",
        },
    ]
    ranked = rank_demo_products(products, "what is the price of bayberry swim trunk?")
    assert ranked[0][1]["title"].startswith("Bayberry Swim Trunk")


def test_demo_cards_for_price_question_returns_single_best_match() -> None:
    products = [
        {
            "title": "Bayberry Swim Trunk - Island Blue Leaves",
            "handle": "bayberry-swim-trunk-island-blue",
            "url": "https://store.example.com/products/bayberry-swim-trunk-island-blue",
            "min_price": "88.00",
            "currency": "USD",
        },
        {
            "title": "Anchor Swim Short - Bay Blue",
            "handle": "anchor-swim-short-bay-blue",
            "url": "https://store.example.com/products/anchor-swim-short-bay-blue",
            "min_price": "88.00",
            "currency": "USD",
        },
    ]
    cards = demo_cards_for_turn(products, "what is the price of bayberry swim trunk?")
    assert len(cards) == 1
    assert cards[0]["title"].startswith("Bayberry Swim Trunk")
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
    assert prompts[0].lower().startswith("hello")
    assert any("Classic Hoodie" in p for p in prompts)
    assert any("return" in p.lower() for p in prompts)
    assert len(prompts) <= 4
    assert len(prompts) >= 3


def test_build_qa_questions_includes_negative_probe() -> None:
    from app.domains.demo.qa_judge import _FAKE_PROBE_PRODUCT, build_qa_questions

    products = [normalized_sample_product().model_dump()]
    questions = build_qa_questions(products, {"refund": "30 days"})
    categories = {q["category"] for q in questions}
    assert "negative_probe" in categories
    assert "out_of_scope" in categories
    negative = next(q for q in questions if q["category"] == "negative_probe")
    assert _FAKE_PROBE_PRODUCT in negative["question"]
    catalog_text = " ".join(
        [
            str(products[0].get("title") or ""),
            str(products[0].get("product_type") or ""),
            str(products[0].get("handle") or ""),
        ]
    ).casefold()
    for token in _FAKE_PROBE_PRODUCT.casefold().split():
        if len(token) >= 4:
            assert token not in catalog_text


def test_product_to_index_text_uses_store_currency() -> None:
    product = normalized_sample_product().model_copy(update={"currency": "PKR", "min_price": "2640.00"})
    text = product_to_index_text(product)
    assert "Price: 2640.00 PKR" in text
    assert "$2640.00" not in text


def test_extract_shopify_policy_text_prefers_policy_body() -> None:
    from app.domains.demo.storefront_ingest import _extract_shopify_policy_text

    html = """
    <html><head><meta property="og:site_name" content="Login"></head>
    <body><main><div class="shopify-policy__body">
    <p>Returns accepted within 30 days in original packaging.</p>
    </div></main></body></html>
    """
    text = _extract_shopify_policy_text(html)
    assert "30 days" in text
    assert "og:site_name" not in text


def test_extract_shop_currency_from_theme_script() -> None:
    from app.domains.demo.storefront_ingest import _extract_shop_currency

    html = '<script>Shopify.currency = {"active":"PKR","rate":"1.0"};</script>'
    assert _extract_shop_currency(html) == "PKR"


def test_demo_public_url_uses_fixed_base() -> None:
    url = demo_public_url("acme-x1y2z3")
    assert url == f"{DEMO_PUBLIC_BASE_URL}/demo/acme-x1y2z3"


def test_build_demo_slug_contains_name() -> None:
    slug = build_demo_slug("Acme Store")
    assert slug == "acme-store"


def test_qa_routing_threshold() -> None:
    from app.domains.demo.constants import DEMO_QA_SCORE_THRESHOLD

    scores = [0.9, 0.85, 0.8]
    avg = sum(scores) / len(scores)
    assert avg >= DEMO_QA_SCORE_THRESHOLD
    low = [0.5, 0.6]
    assert sum(low) / len(low) < DEMO_QA_SCORE_THRESHOLD


def test_demo_step_prints_clean_line(capsys) -> None:
    from app.domains.demo.progress import demo_step

    demo_step("provision.ingest", store="https://example.com", echo=True)
    out = capsys.readouterr().out
    assert "[demo]" in out
    assert "Fetching storefront" in out
    assert "example.com" in out


def test_build_compact_catalog_index() -> None:
    from app.domains.demo.demo_catalog_selector import build_compact_catalog_index

    product = normalized_sample_product().model_dump()
    index = build_compact_catalog_index([product])
    assert "classic-hoodie" in index
    assert "Classic Hoodie" in index


def test_fallback_select_products() -> None:
    from app.domains.demo.demo_catalog_selector import fallback_select_products

    products = [normalized_sample_product().model_dump()]
    selected = fallback_select_products(products, "Classic Hoodie price?")
    assert len(selected) == 1
    assert selected[0]["handle"] == "classic-hoodie"


def test_fallback_demo_search_plan_product() -> None:
    from app.domains.demo.demo_search_planner import fallback_demo_search_plan

    plan = fallback_demo_search_plan("what is the price of bayberry swim trunk?")
    assert plan.intent == "product"
    assert plan.search_queries
    assert any("bayberry" in q.casefold() for q in plan.search_queries)


def test_fallback_demo_search_plan_policy() -> None:
    from app.domains.demo.demo_search_planner import fallback_demo_search_plan

    plan = fallback_demo_search_plan("What's your return policy?")
    assert plan.intent == "policy"
    assert "refund" in plan.policy_topics


def test_row_is_queued() -> None:
    from app.domains.demo.sheets_sync import _row_is_queued

    assert _row_is_queued("Yes")
    assert _row_is_queued("y")
    assert _row_is_queued("Processing")
    assert _row_is_queued("processing")
    assert not _row_is_queued("needs_review")
    assert not _row_is_queued("Ready")
    assert not _row_is_queued("")


def test_parse_service_account_config_inline_json() -> None:
    from app.domains.demo.sheets_sync import _parse_service_account_config

    inline = '{"type":"service_account","client_email":"a@b.iam.gserviceaccount.com","token_uri":"https://oauth2.googleapis.com/token"}'
    info, path = _parse_service_account_config(inline)
    assert info is not None
    assert info["client_email"] == "a@b.iam.gserviceaccount.com"
    assert path == ""

    quoted = f"'{inline}'"
    info2, path2 = _parse_service_account_config(quoted)
    assert info2 == info
    assert path2 == ""

    info3, path3 = _parse_service_account_config("/etc/sa.json")
    assert info3 is None
    assert path3 == "/etc/sa.json"


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


def test_pick_store_logo_prefers_favicon_over_white_header() -> None:
    from bs4 import BeautifulSoup

    from app.domains.demo.store_branding import pick_store_logo_url

    html = """
    <html><head>
      <link rel="shortcut icon" href="//store.example.com/cdn/shop/files/brand-mark_96x.jpg">
    </head>
    <body>
      <img class="Header__LogoImage Header__LogoImage--primary"
           src="//store.example.com/cdn/shop/files/brand-logo-white_140x.webp"
           srcset="//store.example.com/cdn/shop/files/brand-logo-white_140x.webp 1x,
                   //store.example.com/cdn/shop/files/brand-logo-white_140x@2x.webp 2x"
           alt="Brand">
    </body></html>
    """
    soup = BeautifulSoup(html, "lxml")
    logo = pick_store_logo_url(
        soup=soup,
        base_url="https://store.example.com",
        social_preview_url=None,
    )
    assert logo == "https://store.example.com/cdn/shop/files/brand-mark.jpg"


def test_pick_store_logo_shopglamup_fixture() -> None:
    from bs4 import BeautifulSoup

    from app.domains.demo.store_branding import pick_store_logo_url

    html = """
    <html><head>
      <link rel="shortcut icon" href="//www.shopglamup.com/cdn/shop/files/New_Project_96x.jpg?v=1705607456">
    </head>
    <body>
      <img class="Header__LogoImage Header__LogoImage--primary"
           src="//www.shopglamup.com/cdn/shop/files/glamup-logo-png-white-1_140x.webp?v=1673965370"
           srcset="//www.shopglamup.com/cdn/shop/files/glamup-logo-png-white-1_140x.webp?v=1673965370 1x,
                   //www.shopglamup.com/cdn/shop/files/glamup-logo-png-white-1_140x@2x.webp?v=1673965370 2x"
           alt="SHOPGLAMUP">
    </body></html>
    """
    soup = BeautifulSoup(html, "lxml")
    logo = pick_store_logo_url(
        soup=soup,
        base_url="https://www.shopglamup.com",
        social_preview_url=None,
    )
    assert logo == "https://www.shopglamup.com/cdn/shop/files/New_Project.jpg?v=1705607456"


def test_pick_brand_color_from_theme_meta() -> None:
    from bs4 import BeautifulSoup

    from app.domains.demo.store_branding import pick_brand_color

    html = '<html><head><meta name="theme-color" content="#112233"></head></html>'
    soup = BeautifulSoup(html, "lxml")
    assert pick_brand_color(soup=soup, html_text=html) == "#112233"


def test_refine_demo_brand_color_darkens_bright_yellow() -> None:
    from app.domains.demo.store_branding import refine_demo_brand_color

    refined = refine_demo_brand_color("#ffff00")
    assert refined is not None
    assert refined != "#ffff00"
    assert refine_demo_brand_color("#112233") == "#112233"


def test_logo_link_from_sheet_snapshot() -> None:
    from app.domains.demo.demo_sheet_fields import logo_link_from_sheet_snapshot

    assert logo_link_from_sheet_snapshot({}) is None
    assert logo_link_from_sheet_snapshot({"logo link": ""}) is None
    assert (
        logo_link_from_sheet_snapshot(
            {"logo link": "//cdn.example.com/brand.png"}
        )
        == "https://cdn.example.com/brand.png"
    )
    assert (
        logo_link_from_sheet_snapshot(
            {"logo link": "https://cdn.example.com/logo.svg"}
        )
        == "https://cdn.example.com/logo.svg"
    )
    assert logo_link_from_sheet_snapshot({"logo link": "not-a-url"}) is None


def test_instagram_link_from_sheet_snapshot() -> None:
    from app.domains.demo.demo_sheet_fields import (
        build_demo_welcome_social_links,
        instagram_link_from_sheet_snapshot,
    )

    assert instagram_link_from_sheet_snapshot({}) is None
    assert instagram_link_from_sheet_snapshot({"instagram link": ""}) is None
    assert (
        instagram_link_from_sheet_snapshot({"instagram link": "https://www.instagram.com/mcs/"})
        == "https://www.instagram.com/mcs/"
    )
    assert (
        instagram_link_from_sheet_snapshot({"instagram link": "@mcsstore"})
        == "https://www.instagram.com/mcsstore/"
    )

    links = build_demo_welcome_social_links(
        store_url="https://store.example.com",
        sheet_snapshot={"instagram link": "https://www.instagram.com/brand/"},
    )
    assert len(links) == 2
    assert links[0]["label"] == "Visit our website"
    assert links[0]["url"] == "https://store.example.com"
    assert links[1]["label"] == "Follow us on Instagram"
    assert "instagram.com" in links[1]["url"]
