"""Ciclos de cultivo de una parcela (public.crop_cycle).

- Cultivo anterior: último ciclo 'finished' (crop_code obligatorio).
- Cultivo actual:   único ciclo 'active'   (crop_code obligatorio).
- Próxima campaña:  único ciclo 'planned'  (sowing_date obligatoria; crop_code opcional).
"""

from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.schemas.common import UtcDatetime

CycleStatus = Literal["active", "finished", "planned"]
CycleOrigin = Literal["farmer", "recommendation"]
CropCode = Annotated[str, StringConstraints(pattern=r"^[a-z0-9_]+$", max_length=64)]


class CropCycleCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: CycleStatus
    crop_code: CropCode | None = Field(default=None, description="ID de GET /api/crops; opcional solo en 'planned'")
    sowing_date: date | None = Field(default=None, description="Obligatoria en 'planned'")
    harvest_date: date | None = None
    origin: CycleOrigin = "farmer"


class CropCycleUpdate(BaseModel):
    """PATCH parcial por ID. Se valida el ciclo resultante con las mismas reglas."""

    model_config = ConfigDict(extra="forbid")

    status: CycleStatus | None = None
    crop_code: CropCode | None = None
    sowing_date: date | None = None
    harvest_date: date | None = None
    origin: CycleOrigin | None = None


class CropCycleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    plot_id: UUID
    crop_code: str | None
    sowing_date: date | None
    harvest_date: date | None
    status: CycleStatus
    origin: CycleOrigin
    created_at: UtcDatetime


class CropCyclesSummary(BaseModel):
    """Lo que necesita el formulario de parcela, más el historial completo."""

    previous: CropCycleRead | None = Field(description="Último ciclo 'finished'")
    current: CropCycleRead | None = Field(description="Ciclo 'active'")
    planned: CropCycleRead | None = Field(description="Ciclo 'planned' (próxima campaña)")
    cycles: list[CropCycleRead] = Field(description="Todos los ciclos, del más reciente al más antiguo")
