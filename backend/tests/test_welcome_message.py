from app.domains.public_widget.welcome import default_welcome_message, resolve_welcome_message


def test_default_welcome_message() -> None:
    assert default_welcome_message("Acme Shop") == "Hi there! I'm Acme Shop. What can I help you with today?"
    assert default_welcome_message("") == "Hi there! I'm Support. What can I help you with today?"
    assert default_welcome_message(None) == "Hi there! I'm Support. What can I help you with today?"


def test_resolve_welcome_message_custom() -> None:
    assert resolve_welcome_message("Bot", {"greeting_message": "  Hello there  "}) == "Hello there"


def test_resolve_welcome_message_default() -> None:
    assert resolve_welcome_message("Bot", {}) == "Hi there! I'm Bot. What can I help you with today?"
