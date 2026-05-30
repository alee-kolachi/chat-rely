import json

from app.domains.integrations.shopify.admin_client import compact_json


def test_compact_json_passes_through_small_payload() -> None:
    data = {"products": {"edges": [{"node": {"title": "Boot"}}]}}
    out = compact_json(data, limit=12000)
    assert out == json.dumps(data, ensure_ascii=False, default=str)
    assert "_truncated" not in out


def test_compact_json_signals_truncation_for_large_payload() -> None:
    data = {"items": ["x" * 500] * 40}
    full_len = len(json.dumps(data, ensure_ascii=False, default=str))
    assert full_len > 12000

    out = compact_json(data, limit=12000)
    assert len(out) <= 12000

    payload = json.loads(out)
    assert payload["_truncated"] is True
    assert payload["_original_byte_length"] == full_len
    assert payload["_limit_bytes"] == 12000
    assert "truncated" in payload["message"].lower()
    assert isinstance(payload["preview"], str)
    assert len(payload["preview"]) > 0
