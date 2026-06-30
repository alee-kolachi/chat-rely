from app.domains.public_widget.logo import resolve_widget_avatar_url, widget_logo_url_from_behavior


def test_widget_logo_url_from_behavior() -> None:
    assert widget_logo_url_from_behavior({}) is None
    assert widget_logo_url_from_behavior({"widget_logo_url": "  "}) is None
    assert widget_logo_url_from_behavior({"widget_logo_url": " https://cdn.example/logo.png "}) == (
        "https://cdn.example/logo.png"
    )


def test_resolve_widget_avatar_url_prefers_custom_upload() -> None:
    behavior = {"widget_logo_url": "https://cdn.example/custom.png"}
    assert (
        resolve_widget_avatar_url(behavior, website_favicon_url="https://cdn.example/favicon.ico")
        == "https://cdn.example/custom.png"
    )


def test_resolve_widget_avatar_url_falls_back_to_favicon() -> None:
    assert (
        resolve_widget_avatar_url({}, website_favicon_url="https://cdn.example/favicon.ico")
        == "https://cdn.example/favicon.ico"
    )
