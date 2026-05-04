"""Natural-language human-handoff detection for runtime."""

from app.domains.runtime.service import _message_requests_human


def test_message_requests_human_common_phrases() -> None:
    assert _message_requests_human("I need to talk to human")
    assert _message_requests_human("Can I speak to a real person?")
    assert _message_requests_human("Please connect me with someone from support")
    assert _message_requests_human("I want to speak with an agent")


def test_message_requests_human_negative() -> None:
    assert not _message_requests_human("What are your shipping rates?")
    assert not _message_requests_human("")
    assert not _message_requests_human("Human resources job openings")
