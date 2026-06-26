from app.domains.demo.demo_chat_prompts import build_demo_kb_user_prompt


def test_build_demo_kb_user_prompt_includes_excerpt() -> None:
    prompt = build_demo_kb_user_prompt(
        "Policy (Refund):\nNo cash refund. Exchange within 30 days.",
        "What's your return policy?",
    )
    assert "No cash refund" in prompt
    assert "not fully sure" not in prompt.casefold()
    assert "use this reply exactly" not in prompt.casefold()
