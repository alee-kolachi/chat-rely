"""Unit tests for HTML → plain text used by website indexing."""

from app.domains.knowledge.service import _extract_links, _extract_page_text


def test_extract_includes_meta_description_not_only_body_shell() -> None:
    html = """<!doctype html><html><head>
    <title>Acme</title>
    <meta name="description" content="Acme sells widgets worldwide." />
    <meta property="og:title" content="Acme Store" />
    <meta property="og:description" content="Acme sells widgets worldwide." />
    </head><body><div id="root"></div><script>hydrate()</script></body></html>"""
    text = _extract_page_text(html)
    assert "Acme sells widgets worldwide" in text
    assert "Acme Store" in text or "Acme" in text


def test_malformed_ie_conditional_does_not_hide_same_host_links() -> None:
    """Broken ``<![endif]-->`` / duplicate script blocks confuse html.parser; lxml must still see anchors."""
    html = """<!doctype html><html><head>
    <!--[if lt IE 9]>
    <script type='text/javascript' src='a.js'></script>
    <![endif]-->
    <script type='text/javascript' src='b.js'></script>
    <![endif]-->
    </head><body>
    <a href="/">Home</a>
    <a href="/about">About</a>
    </body></html>"""
    links = _extract_links("https://example.com/foo", html)
    urls = " ".join(links)
    assert "https://example.com/" in urls
    assert "https://example.com/about" in urls


def test_extract_links_allows_www_non_www_same_site() -> None:
    html = """<!doctype html><html><body>
    <a href="https://www.example.com/a">A</a>
    <a href="https://example.com/b">B</a>
    <a href="https://other.example.com/c">C</a>
    </body></html>"""
    links = _extract_links("https://example.com/start", html)
    assert "https://www.example.com/a" in links
    assert "https://example.com/b" in links
    assert "https://other.example.com/c" not in links


def test_extract_next_style_loading_shell_plus_head() -> None:
    html = """<!doctype html><html lang="en"><head>
    <title>LIBBi</title>
    <meta name="description" content="LIBBi is an AI-powered operating system." />
    </head><body><div class="spinner">Loading</div></body></html>"""
    text = _extract_page_text(html)
    assert "LIBBi is an AI-powered operating system" in text
    assert "Loading" in text


def test_extract_includes_json_ld_product_price() -> None:
    html = """<!doctype html><html><head>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "Fearless",
      "description": "Fresh citrus perfume",
      "offers": {
        "@type": "Offer",
        "priceCurrency": "PKR",
        "price": "3990"
      }
    }
    </script>
    </head><body><div id="root"></div></body></html>"""
    text = _extract_page_text(html)
    assert "Fearless" in text
    assert "3990" in text
    assert "PKR" in text


def test_chunk_text_preserves_semantic_blocks() -> None:
    from app.domains.knowledge.service import _chunk_text

    text = (
        "Fearless\n\n"
        "Regular price PKR 3,490\n\n"
        "Top Note: Bergamot, Lemon, Violet\n\n"
        "Ingredients: Water, Limonene"
    )
    chunks = _chunk_text(text, chunk_size=80, overlap=10)
    assert len(chunks) >= 2
    assert any("Regular price PKR 3,490" in c for c in chunks)
