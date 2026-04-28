from dataclasses import dataclass
from typing import Any
from uuid import UUID

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth_state import get_token_verifier
from app.core.errors import AuthError
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
    if credentials is None:
        raise AuthError("Missing bearer token")

    claims = get_token_verifier().verify_token(credentials.credentials)
    try:
        return AuthContext(user_id=UUID(str(claims["sub"])), claims=claims)
    except (TypeError, ValueError) as exc:
        raise AuthError("Token subject is not a valid UUID") from exc

