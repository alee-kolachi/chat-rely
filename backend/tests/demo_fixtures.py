"""Fixtures and helpers for demo outreach tests."""

from __future__ import annotations

from app.domains.demo.storefront_ingest import _normalize_product


def sample_shopify_product() -> dict:
    return {
        "id": 123,
        "title": "Classic Hoodie",
        "handle": "classic-hoodie",
        "body_html": "<p>Soft cotton hoodie.</p>",
        "vendor": "Acme",
        "product_type": "Apparel",
        "tags": "hoodie, cotton",
        "variants": [{"title": "S", "price": "48.00", "sku": "HD-S"}],
        "options": [{"name": "Size", "values": ["S", "M", "L"]}],
        "images": [{"src": "https://cdn.example.com/hoodie.jpg"}],
    }


def normalized_sample_product():
    return _normalize_product(sample_shopify_product(), base_url="https://store.example.com")
