from app.core.security import TokenVerifier

_token_verifier: TokenVerifier | None = None


def set_token_verifier(verifier: TokenVerifier) -> None:
    global _token_verifier
    _token_verifier = verifier


def get_token_verifier() -> TokenVerifier:
    if _token_verifier is None:
        raise RuntimeError("Token verifier not initialized")
    return _token_verifier

