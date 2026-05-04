from uuid import UUID

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.domains.bootstrap.service import _ensure_profile
from app.domains.profile.schemas import MeProfileResponse, UpdateProfileRequest


async def _fetch_auth_email(db: AsyncSession, user_id: UUID) -> str | None:
    result = await db.execute(
        text("select email from auth.users where id = cast(:user_id as uuid)"),
        {"user_id": str(user_id)},
    )
    row = result.mappings().first()
    if not row:
        return None
    return row["email"]


async def get_me_profile(db: AsyncSession, user_id: UUID) -> MeProfileResponse:
    profile = await _ensure_profile(db, user_id)
    email = await _fetch_auth_email(db, user_id)
    return MeProfileResponse(
        id=profile.id,
        email=(email or "").strip(),
        full_name=profile.full_name,
        avatar_url=profile.avatar_url,
        timezone=profile.timezone,
        email_notifications_enabled=profile.email_notifications_enabled,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


async def update_me_profile(
    db: AsyncSession, user_id: UUID, body: UpdateProfileRequest
) -> MeProfileResponse:
    data = body.model_dump(exclude_unset=True)
    if not data:
        return await get_me_profile(db, user_id)

    await _ensure_profile(db, user_id)

    if "full_name" in data or "avatar_url" in data:
        sets: list[str] = []
        params: dict[str, object] = {"user_id": str(user_id)}
        if "full_name" in data:
            sets.append("full_name = :full_name")
            params["full_name"] = data["full_name"]
        if "avatar_url" in data:
            sets.append("avatar_url = :avatar_url")
            params["avatar_url"] = data["avatar_url"]
        if sets:
            await db.execute(
                text(
                    f"""
                    update public.profiles
                    set {", ".join(sets)}
                    where id = cast(:user_id as uuid)
                    """
                ),
                params,
            )

    if "email" in data and data["email"] is not None:
        new_email = str(data["email"]).strip().lower()
        try:
            email_result = await db.execute(
                text(
                    """
                    update auth.users
                    set email = :email,
                        updated_at = now()
                    where id = cast(:user_id as uuid)
                    returning email
                    """
                ),
                {"user_id": str(user_id), "email": new_email},
            )
        except IntegrityError as exc:
            await db.rollback()
            raise AppError(
                code="profile.email_conflict",
                message="That email is already in use.",
                status_code=409,
            ) from exc
        if email_result.mappings().first() is None:
            await db.rollback()
            raise AppError(
                code="profile.email_update_failed",
                message="Could not update email for this account.",
                status_code=400,
            )

    await db.commit()
    return await get_me_profile(db, user_id)
