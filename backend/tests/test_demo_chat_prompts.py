from app.domains.demo.demo_chat_prompts import (
    build_demo_catalog_system_appendix,
    build_demo_kb_system_appendix,
    build_demo_kb_user_prompt,
)


def test_build_demo_kb_user_prompt_includes_excerpt() -> None:
    prompt = build_demo_kb_user_prompt(
        "Policy (Refund):\nNo cash refund. Exchange within 30 days.",
        "What's your return policy?",
    )
    assert "No cash refund" in prompt
    assert "not fully sure" not in prompt.casefold()
    assert "use this reply exactly" not in prompt.casefold()
    assert "do not reply with only a link" in prompt.casefold()


def test_build_demo_catalog_system_appendix_mentions_details_tool() -> None:
    appendix = build_demo_catalog_system_appendix()
    assert "shopify_product_details" in appendix
    assert "sizes" in appendix.casefold()
    assert "plain text" in appendix.casefold()
