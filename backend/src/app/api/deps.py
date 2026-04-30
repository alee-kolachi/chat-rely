from dataclasses import dataclass
from typing import Any
from uuid import UUID

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth_state import get_token_verifier, try_get_token_verifier
from app.core.errors import AuthError
from app.core.settings import get_settings
from app.db.session import get_db_session

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class AuthContext:
    user_id: UUID
    claims: dict[str, Any]


def get_db(session: AsyncSession = Depends(get_db_session)) -> AsyncSession:
    return session


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthContext:
    settings = get_settings()
    if settings.is_development and settings.dev_auth_bypass_enabled:
        # In local development, allow onboarding flows without repeated login.
        fallback_claims = {"sub": settings.dev_auth_bypass_user_id, "role": "dev_bypass"}
        if credentials is None:
            return AuthContext(user_id=UUID(settings.dev_auth_bypass_user_id), claims=fallback_claims)
        verifier = try_get_token_verifier()
        if verifier is None:
            return AuthContext(user_id=UUID(settings.dev_auth_bypass_user_id), claims=fallback_claims)
        try:
            claims = verifier.verify_token(credentials.credentials)
        except AuthError:
            return AuthContext(user_id=UUID(settings.dev_auth_bypass_user_id), claims=fallback_claims)
    else:
        if credentials is None:
            raise AuthError("Missing bearer token")
        claims = get_token_verifier().verify_token(credentials.credentials)
    try:
        return AuthContext(user_id=UUID(str(claims["sub"])), claims=claims)
    except (TypeError, ValueError) as exc:
        raise AuthError("Token subject is not a valid UUID") from exc

