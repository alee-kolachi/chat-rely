from functools import lru_cache
from typing import Any

from pydantic import AnyHttpUrl, PostgresDsn, ValidationError, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    app_name: str = "ChatRely Backend"
    app_env: str = "development"
    app_version: str = "0.1.0"
    log_level: str = "INFO"
    allowed_origins: list[AnyHttpUrl] = []

    database_url: PostgresDsn
    supabase_jwks_url: AnyHttpUrl
    supabase_issuer: AnyHttpUrl
    supabase_audience: str = "authenticated"
    openai_api_key: str | None = None
    openai_embedding_model: str = "text-embedding-3-small"
    openai_chat_model: str = "gpt-4o-mini"
    dev_auth_bypass_enabled: bool = True
    dev_auth_bypass_user_id: str = "00000000-0000-0000-0000-000000000001"

    # Shopify Partner app + OAuth (https://shopify.dev/docs/apps/auth/oauth)
    shopify_api_key: str | None = None
    shopify_api_secret: str | None = None
    """Comma-separated OAuth scopes; defaults match common read-only storefront support."""
    shopify_scopes: str = "read_customers,read_fulfillments,read_inventory,read_orders,read_products"
    shopify_api_version: str = "2026-04"
    """Public URL of this API for OAuth callback (e.g. http://127.0.0.1:8000). No trailing slash."""
    public_api_base_url: str = "http://127.0.0.1:8000"
    """Where to send the merchant browser after successful OAuth (e.g. http://localhost:3000/actions)."""
    shopify_oauth_success_redirect: str = "http://localhost:3000/actions"
    """Fernet key (urlsafe base64 32 bytes). Encrypts shopify access_token at rest."""
    integration_token_fernet_key: str | None = None
    """HMAC secret for signed OAuth state payloads."""
    integration_oauth_state_secret: str | None = None

    # Mailjet (transactional + Parse inbound). Optional until email bridge is configured.
    mailjet_api_key: str | None = None
    mailjet_api_secret: str | None = None
    mailjet_sender_email: str | None = None
    mailjet_sender_name: str = "Support"
    """Domain receiving inbound mail (Parse route), e.g. support.example.com — used in Reply-To."""
    mailjet_inbound_domain: str | None = None
    """Optional separate secret for reply tokens; defaults to integration_oauth_state_secret."""
    mailjet_reply_hmac_secret: str | None = None
    """Shared secret on inbound webhook URL (?verify=) to reject stray traffic."""
    mailjet_inbound_webhook_secret: str | None = None

    @model_validator(mode="before")
    @classmethod
    def apply_development_defaults(cls, values: Any) -> Any:
        if not isinstance(values, dict):
            return values
        app_env = str(values.get("app_env") or values.get("APP_ENV") or "development").lower()
        if app_env != "development":
            return values

        # Keep local startup ergonomic when .env has not been created yet.
        values.setdefault("database_url", "postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres")
        values.setdefault("supabase_jwks_url", "https://example.com/.well-known/jwks.json")
        values.setdefault("supabase_issuer", "https://example.com/auth/v1")
        # Dev-only: replace in production. Fernet key for encrypting integration tokens.
        values.setdefault(
            "integration_token_fernet_key",
            "0xJVyOJM1vvMiH6NSfvvxCVF5Av363ZALelKvhO4NMg=",
        )
        values.setdefault(
            "integration_oauth_state_secret",
            "dev-only-oauth-state-secret-min-32-characters-long",
        )
        return values

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()


def validate_settings() -> None:
    try:
        get_settings()
    except ValidationError as exc:
        raise RuntimeError(f"Invalid backend configuration: {exc}") from exc

