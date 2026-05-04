from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


class MeProfileResponse(BaseModel):
    id: UUID
    email: str
    full_name: str | None
    avatar_url: str | None
    timezone: str
    email_notifications_enabled: bool
    created_at: datetime
    updated_at: datetime


class UpdateProfileRequest(BaseModel):
    full_name: Annotated[str | None, Field(max_length=500)] = None
    email: EmailStr | None = None
    avatar_url: Annotated[str | None, Field(max_length=2048)] = None

    @field_validator("full_name", mode="before")
    @classmethod
    def full_name_empty_to_none(cls, v: object) -> str | None:
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip()
            return None if s == "" else s
        return str(v)

    @field_validator("avatar_url", mode="before")
    @classmethod
    def avatar_empty_to_none(cls, v: object) -> str | None:
        if v is None:
            return None
        if isinstance(v, str) and v.strip() == "":
            return None
        return v if isinstance(v, str) else str(v)
