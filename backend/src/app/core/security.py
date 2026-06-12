import asyncio
from datetime import UTC, datetime
from typing import Any

import jwt
import structlog
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError, PyJWKClientError

from app.core.errors import AuthError
from app.core.settings import Settings

log = structlog.get_logger("auth")


class TokenVerifier:
    _ALLOWED_ALGORITHMS = {"RS256", "ES256"}

    def __init__(self, settings: Settings) -> None:
        self._audience = settings.supabase_audience
        self._issuer = str(settings.supabase_issuer)
        self._jwks_url = str(settings.supabase_jwks_url)
        self._jwk_client = PyJWKClient(self._jwks_url, timeout=30)

    async def warmup(self) -> None:
        # Prime JWKS cache at startup. Non-fatal: verify_token fetches on first use if this fails.
        try:
            await asyncio.to_thread(self._jwk_client.fetch_data)
            log.info("auth.jwks_warmup_done")
        except Exception as exc:
            log.warning(
                "auth.jwks_warmup_failed",
                error=str(exc),
                hint="Check SUPABASE_JWKS_URL and network access to Supabase Auth",
            )

    def verify_token(self, token: str) -> dict[str, Any]:
        try:
            header = jwt.get_unverified_header(token)
            algorithm = str(header.get("alg", ""))
            if algorithm not in self._ALLOWED_ALGORITHMS:
                raise AuthError(f"Unsupported token algorithm: {algorithm or 'missing'}")

            signing_key = self._jwk_client.get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=[algorithm],
                audience=self._audience,
                issuer=self._issuer,
                options={"verify_exp": True},
            )
            self._validate_claims(claims)
            return claims
        except PyJWKClientError as exc:
            raise AuthError(details={"reason": str(exc)}) from exc
        except InvalidTokenError as exc:
            raise AuthError(details={"reason": str(exc)}) from exc

    @staticmethod
    def _validate_claims(claims: dict[str, Any]) -> None:
        sub = claims.get("sub")
        if not sub:
            raise AuthError("Token is missing user subject")

        exp = claims.get("exp")
        if exp is None:
            raise AuthError("Token is missing expiry")
        if datetime.fromtimestamp(exp, tz=UTC) < datetime.now(tz=UTC):
            raise AuthError("Token has expired")

