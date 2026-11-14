"""Esquemas de parcelas declaradas por el agricultor."""

from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.schemas.common import UtcDatetime

PlotName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Priority = Literal[
    "save_water", "improve_soil", "reduce_climate_risk", "diversify", "maintain_productivity",
]


class PlotCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: PlotName
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)
    area_ha: float | None = Field(default=None, gt=0, allow_inf_nan=False)
    water_source: str | None = Field(default=None, max_length=120)
    water_availability: Literal["low", "medium", "high"] | None = None
    soil_texture: str | None = Field(default=None, max_length=120)
    soil_ph: float | None = Field(default=None, ge=0, le=14, allow_inf_nan=False)
    soil_salinity_ds_m: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    priority: Priority | None = None
    declared_irrigated: bool | None = None


class PlotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    name: str
    latitude: float
    longitude: float
    area_ha: float | None
    water_source: str | None
    water_availability: str | None
    soil_texture: str | None
    soil_ph: float | None
    soil_salinity_ds_m: float | None
    priority: str | None
    declared_irrigated: bool | None
    created_at: UtcDatetime
