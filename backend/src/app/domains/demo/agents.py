"""Create demo agents (is_demo=true, no plan limits)."""

from __future__ import annotations

import json
import re
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.domains.demo.system_user import ensure_demo_system_user


def _slugify(value: str) -> str:
    candidate = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return candidate or "demo-agent"


async def create_demo_agent(
    db: AsyncSession,
    *,
    name: str,
    slug: str | None = None,
) -> tuple[UUID, str]:
    user_id = await ensure_demo_system_user(db)
    agent_slug = slug or _slugify(name)
    try:
        row = (
            await db.execute(
                text(
                    """
                    insert into public.agents (
                      user_id, name, slug, model, system_prompt, behavior_settings, is_demo
                    ) values (
                      cast(:user_id as uuid),
                      :name,
                      :slug,
                      'gpt-4o-mini',
                      '',
                      cast(:behavior_settings as jsonb),
                      true
                    )
                    returning id, public_key
                    """
                ),
                {
                    "user_id": str(user_id),
                    "name": name[:120],
                    "slug": agent_slug[:120],
                    "behavior_settings": json.dumps(
                        {
                            "greeting_messages": [
                                f"Hi! Ask me anything about {name}'s products, shipping, or returns.",
                            ]
                        }
                    ),
                },
            )
        ).mappings().one()
    except IntegrityError as exc:
        await db.rollback()
        if "agents_user_id_slug_key" in str(exc):
            import secrets

            agent_slug = f"{agent_slug}-{secrets.token_hex(3)}"
            return await create_demo_agent(db, name=name, slug=agent_slug)
        raise

    agent_id = UUID(str(row["id"]))
    await db.execute(
        text(
            """
            insert into public.agent_reliability_settings (agent_id, user_id)
            values (cast(:agent_id as uuid), cast(:user_id as uuid))
            on conflict (agent_id) do nothing
            """
        ),
        {"agent_id": str(agent_id), "user_id": str(user_id)},
    )
    await db.commit()
    return agent_id, str(row["public_key"])
