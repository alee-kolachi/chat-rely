"""Load demo catalog tools (widget-equivalent setup, no Shopify OAuth)."""

from __future__ import annotations

import time
from typing import Any
from uuid import UUID

import structlog

from app.domains.demo.demo_lc_tools import build_demo_langchain_tools
from app.domains.demo.demo_product_catalog import ensure_demo_product_catalog
from app.domains.demo.repository import fetch_demo_by_agent_id

log = structlog.get_logger("demo.tools_loader")


async def load_demo_tools_fast(
    db,
    *,
    agent_id: UUID,
    customer_message: str | None = None,
) -> tuple[list[Any], dict[str, float], bool]:
    """Return catalog LangChain tools using the same surface as ``_load_shopify_tools_fast``."""
    timings: dict[str, float] = {}
    t0 = time.perf_counter()
    demo = await fetch_demo_by_agent_id(db, agent_id)
    if demo is None:
        timings["load_catalog_ms"] = (time.perf_counter() - t0) * 1000.0
        timings["build_tools_ms"] = 0.0
        return [], timings, False

    t1 = time.perf_counter()
    products, _policies, _compact = await ensure_demo_product_catalog(
        db,
        agent_id=agent_id,
        store_url=demo.store_url,
    )
    timings["load_catalog_ms"] = (time.perf_counter() - t1) * 1000.0

    t2 = time.perf_counter()
    tool_list = build_demo_langchain_tools(
        products,
        customer_message=customer_message,
    ) if products else []
    timings["build_tools_ms"] = (time.perf_counter() - t2) * 1000.0
    timings["load_connection_ms"] = timings["load_catalog_ms"]
    timings["list_actions_ms"] = 0.0
    timings["router_llm_ms"] = 0.0

    return tool_list, timings, bool(products)
