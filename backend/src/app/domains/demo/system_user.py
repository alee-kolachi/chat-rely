"""Ensure the internal demo-outreach auth user exists (no env user id)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.bootstrap.service import _ensure_default_subscription
from app.domains.demo.constants import DEMO_SYSTEM_USER_EMAIL, DEMO_SYSTEM_USER_ID

_cached_user_id: UUID | None = None


async def ensure_demo_system_user(db: AsyncSession) -> UUID:
    global _cached_user_id
    if _cached_user_id is not None:
        return _cached_user_id

    row = (
        await db.execute(
            text(
                """
                select id
                from auth.users
                where lower(email) = lower(:email)
                limit 1
                """
            ),
            {"email": DEMO_SYSTEM_USER_EMAIL},
        )
    ).mappings().first()
    if row is not None:
        _cached_user_id = UUID(str(row["id"]))
        return _cached_user_id

    await db.execute(
        text(
            """
            insert into auth.users (
              id,
              instance_id,
              aud,
              role,
              email,
              encrypted_password,
              email_confirmed_at,
              raw_app_meta_data,
              raw_user_meta_data,
              created_at,
              updated_at,
              is_super_admin
            ) values (
              cast(:id as uuid),
              '00000000-0000-0000-0000-000000000000',
              'authenticated',
              'authenticated',
              :email,
              crypt('demo-outreach-not-used', gen_salt('bf')),
              now(),
              '{"provider":"email","providers":["email"]}'::jsonb,
              '{"full_name":"Demo Outreach"}'::jsonb,
              now(),
              now(),
              false
            )
            on conflict (id) do nothing
            """
        ),
        {"id": str(DEMO_SYSTEM_USER_ID), "email": DEMO_SYSTEM_USER_EMAIL},
    )
    await db.execute(
        text(
            """
            insert into public.profiles (id, full_name, timezone)
            values (cast(:id as uuid), 'Demo Outreach', 'UTC')
            on conflict (id) do nothing
            """
        ),
        {"id": str(DEMO_SYSTEM_USER_ID)},
    )
    await _ensure_default_subscription(db, DEMO_SYSTEM_USER_ID)
    await db.commit()

    _cached_user_id = DEMO_SYSTEM_USER_ID
    return _cached_user_id
