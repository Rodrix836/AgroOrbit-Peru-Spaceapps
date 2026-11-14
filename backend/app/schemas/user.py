"""Esquemas del perfil del usuario autenticado."""

from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, StringConstraints

from app.schemas.common import UtcDatetime

DisplayName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]


class UserProfileUpsert(BaseModel):
    model_config = ConfigDict(extra="forbid")
    display_name: DisplayName


class UserProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    auth_user_id: UUID | None
    display_name: str
    created_at: UtcDatetime
