from app.domains.public_widget.welcome import default_welcome_message, resolve_welcome_message


def test_default_welcome_message() -> None:
    assert default_welcome_message("Acme Shop") == "Hi! I'm Acme Shop. How can I help?"
    assert default_welcome_message("") == "Hi! I'm Support. How can I help?"
    assert default_welcome_message(None) == "Hi! I'm Support. How can I help?"


def test_resolve_welcome_message_custom() -> None:
    assert resolve_welcome_message("Bot", {"greeting_message": "  Hello there  "}) == "Hello there"


def test_resolve_welcome_message_default() -> None:
    assert resolve_welcome_message("Bot", {}) == "Hi! I'm Bot. How can I help?"
