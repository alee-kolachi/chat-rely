"""In-memory cache for demo product catalogs (filled on demo page load)."""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from app.domains.demo.demo_catalog_selector import build_compact_catalog_index

_CACHE_TTL_SECONDS = 1800


@dataclass
class DemoCatalogCacheEntry:
    products: list[dict[str, Any]]
    policies: dict[str, str]
    compact_index: str
    warmed_at: float


_catalog_cache: dict[str, DemoCatalogCacheEntry] = {}


def get_demo_catalog_cache(agent_id: UUID) -> DemoCatalogCacheEntry | None:
    entry = _catalog_cache.get(str(agent_id))
    if entry is None:
        return None
    if time.time() - entry.warmed_at > _CACHE_TTL_SECONDS:
        _catalog_cache.pop(str(agent_id), None)
        return None
    return entry


def cache_demo_catalog(
    agent_id: UUID,
    products: list[dict[str, Any]],
    policies: dict[str, str],
) -> DemoCatalogCacheEntry:
    entry = DemoCatalogCacheEntry(
        products=products,
        policies=policies or {},
        compact_index=build_compact_catalog_index(products),
        warmed_at=time.time(),
    )
    _catalog_cache[str(agent_id)] = entry
    return entry
