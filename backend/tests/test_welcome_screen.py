from app.domains.public_widget.welcome_screen import (
    resolve_welcome_screen_button_label,
    resolve_welcome_screen_description,
    resolve_welcome_screen_enabled,
    resolve_welcome_screen_headline,
    resolve_welcome_screen_social_links,
)


def test_welcome_screen_defaults() -> None:
    assert resolve_welcome_screen_enabled({}) is True
    assert resolve_welcome_screen_headline({}) == "How can we help?"
    assert resolve_welcome_screen_description({}) == "Ask about orders, products, or store policies."
    assert resolve_welcome_screen_button_label({}) == "Chat with us"


def test_welcome_screen_social_links_defaults() -> None:
    assert resolve_welcome_screen_social_links({}) == [
        {"label": "Follow us on Instagram", "url": ""},
        {"label": "Follow us on TikTok", "url": ""},
    ]


def test_welcome_screen_social_links_custom() -> None:
    behavior = {
        "welcome_screen_social_links": [
            {"label": "  Instagram  ", "url": " https://instagram.com/store "},
            {"label": "YouTube", "url": "https://youtube.com/@store"},
        ]
    }
    assert resolve_welcome_screen_social_links(behavior) == [
        {"label": "Instagram", "url": "https://instagram.com/store"},
        {"label": "YouTube", "url": "https://youtube.com/@store"},
    ]


def test_welcome_screen_custom() -> None:
    behavior = {
        "welcome_screen_enabled": False,
        "welcome_screen_headline": "  Welcome!  ",
        "welcome_screen_description": "  We ship fast.  ",
        "welcome_screen_button_label": "  Start chat  ",
    }
    assert resolve_welcome_screen_enabled(behavior) is False
    assert resolve_welcome_screen_headline(behavior) == "Welcome!"
    assert resolve_welcome_screen_description(behavior) == "We ship fast."
    assert resolve_welcome_screen_button_label(behavior) == "Start chat"
