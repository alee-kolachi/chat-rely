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

