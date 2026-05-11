"""Optional startup warmup for Shopify runtime caches (connection + enabled actions)."""

from __future__ import annotations

from uuid import UUID

import structlog
from sqlalchemy import text

from app.core.settings import get_settings
from app.db.session import get_session_factory
from app.domains.actions.service import list_enabled_shopify_actions_for_runtime
from app.domains.integrations.shopify.service import load_shopify_connection_for_agent

log = structlog.get_logger("runtime.shopify_warmup")


async def warm_shopify_runtime_caches() -> None:
    """Populate in-process Shopify caches so the first visitor message is not always a cold miss."""
    settings = get_settings()
    if not settings.runtime_shopify_cache_warm_on_startup:
        return
    lim = max(0, int(settings.runtime_shopify_cache_warm_max_agents))
    if lim == 0:
        return

    sf = get_session_factory()
    try:
        async with sf() as s:
            result = await s.execute(
                text(
                    """
                    select a.user_id, c.agent_id
                    from public.shopify_connections c
                    inner join public.agents a on a.id = c.agent_id
                    where c.status = 'connected'
                    limit :lim
                    """
                ),
                {"lim": lim},
            )
            pairs = [
                (UUID(str(r["user_id"])), UUID(str(r["agent_id"])))
                for r in result.mappings().all()
            ]
    except Exception as exc:
        log.warning("runtime.shopify_warmup_query_failed", error=str(exc))
        return

    if not pairs:
        log.info("runtime.shopify_warmup_skipped", reason="no_connected_stores")
        return

    warmed = 0
    for user_id, agent_id in pairs:
        try:
            async with sf() as s:
                conn = await load_shopify_connection_for_agent(s, user_id=user_id, agent_id=agent_id)
                if conn:
                    await list_enabled_shopify_actions_for_runtime(s, user_id=user_id, agent_id=agent_id)
                    warmed += 1
        except Exception as exc:
            log.warning(
                "runtime.shopify_warmup_agent_failed",
                agent_id=str(agent_id),
                error=str(exc),
            )

    log.info(
        "runtime.shopify_warmup_done",
        attempted=len(pairs),
        warmed=warmed,
    )
