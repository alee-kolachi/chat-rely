from functools import lru_cache

from pydantic import AnyHttpUrl, PostgresDsn, ValidationError
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

