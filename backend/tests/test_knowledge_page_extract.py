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


def test_extract_next_style_loading_shell_plus_head() -> None:
    html = """<!doctype html><html lang="en"><head>
    <title>LIBBi</title>
    <meta name="description" content="LIBBi is an AI-powered operating system." />
    </head><body><div class="spinner">Loading</div></body></html>"""
    text = _extract_page_text(html)
    assert "LIBBi is an AI-powered operating system" in text
    assert "Loading" in text
