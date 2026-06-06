from app.domains.public_widget.welcome import (
    default_welcome_message,
    default_welcome_messages,
    resolve_welcome_message,
    resolve_welcome_messages,
)


def test_default_welcome_messages() -> None:
    assert default_welcome_messages("Acme Shop") == [
        "Hey there! I'm Acme Shop, your support assistant. Let's find the best match for you.",
        "Can I get your name and what you're looking for today?",
    ]
    assert default_welcome_messages("") == [
        "Hey there! I'm Support, your support assistant. Let's find the best match for you.",
        "Can I get your name and what you're looking for today?",
    ]
    assert default_welcome_messages(None) == [
        "Hey there! I'm Support, your support assistant. Let's find the best match for you.",
        "Can I get your name and what you're looking for today?",
    ]


def test_default_welcome_message() -> None:
    assert (
        default_welcome_message("Acme Shop")
        == "Hey there! I'm Acme Shop, your support assistant. Let's find the best match for you."
    )


def test_resolve_welcome_message_custom() -> None:
    assert resolve_welcome_message("Bot", {"greeting_message": "  Hello there  "}) == "Hello there"
    assert resolve_welcome_messages("Bot", {"greeting_message": "  Hello there  "}) == ["Hello there"]


def test_resolve_welcome_messages_custom_array() -> None:
    behavior = {"greeting_messages": ["  Hi!  ", "  What brings you here?  "]}
    assert resolve_welcome_messages("Bot", behavior) == ["Hi!", "What brings you here?"]
    assert resolve_welcome_message("Bot", behavior) == "Hi!"


def test_resolve_welcome_message_default() -> None:
    assert resolve_welcome_message("Bot", {}) == (
        "Hey there! I'm Bot, your support assistant. Let's find the best match for you."
    )
    assert resolve_welcome_messages("Bot", {}) == [
        "Hey there! I'm Bot, your support assistant. Let's find the best match for you.",
        "Can I get your name and what you're looking for today?",
    ]
