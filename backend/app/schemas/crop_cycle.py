"""Contratos para registrar y consultar campañas de cultivo."""

from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, StringConstraints, field_validator, model_validator

from app.data.crops import obtener_cultivo
from app.schemas.common import UtcDatetime

CropStatus = Literal["planned", "active", "completed"]
CropId = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]


def _validate_crop_id(value: str) -> str:
    if obtener_cultivo(value) is None:
        raise ValueError("El cultivo no existe en el catálogo.")
    return value


class CropCycleCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    crop_id: CropId
    start_on: date
    end_on: date
    status: CropStatus = "planned"

    @field_validator("crop_id")
    @classmethod
    def crop_must_exist(cls, value: str) -> str:
        return _validate_crop_id(value)

    @model_validator(mode="after")
    def dates_must_be_ordered(self) -> "CropCycleCreate":
        if self.start_on > self.end_on:
            raise ValueError("start_on debe ser anterior o igual a end_on.")
        return self


class CropCycleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    crop_id: CropId | None = None
    start_on: date | None = None
    end_on: date | None = None
    status: CropStatus | None = None

    @field_validator("crop_id")
    @classmethod
    def crop_must_exist(cls, value: str | None) -> str | None:
        return _validate_crop_id(value) if value is not None else value

    @model_validator(mode="after")
    def supplied_fields_cannot_be_null(self) -> "CropCycleUpdate":
        for field in self.model_fields_set:
            if getattr(self, field) is None:
                raise ValueError(f"{field} no puede ser null.")
        if self.start_on and self.end_on and self.start_on > self.end_on:
            raise ValueError("start_on debe ser anterior o igual a end_on.")
        return self


class CropCycleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    plot_id: UUID
    crop_id: str
    start_on: date
    end_on: date
    status: CropStatus
    created_at: UtcDatetime


class CropCycleHistoryRead(BaseModel):
    plot_id: UUID
    current: CropCycleRead | None
    previous: CropCycleRead | None
    campaigns: list[CropCycleRead]
