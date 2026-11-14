"""Contrato de POST /api/recommendations (backend/docs/api-contract.md, «Recomendaciones de rotación»)."""

from datetime import date
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import UtcDatetime

RecommendationPriority = Literal["save_water", "improve_soil"]


class RecommendationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    plot_id: UUID
    priority: RecommendationPriority
    start_on: date | None = Field(
        default=None,
        description="Inicio de la primera campaña (AAAA-MM-DD). Si no viene, se usa la sowing_date del ciclo planned.",
    )
    horizon_days: int = Field(default=365, ge=90, le=730)


class MissingItem(BaseModel):
    field: str
    reason: str


class Assumption(BaseModel):
    field: str
    value: Any
    reason: str


class PowerContext(BaseModel):
    source: Literal["NASA POWER"] = "NASA POWER"
    time_standard: Literal["LST"] = "LST"
    start: date
    end: date
    use: Literal["contexto_del_periodo", "historico"]
    indicators: dict[str, Any]


class SensorContext(BaseModel):
    quality_flag: str | None
    used_as_evidence: bool
    reason: str


class RecommendationContext(BaseModel):
    notice: str
    start_on: date | None = Field(description="Fecha de inicio usada (petición o ciclo planned)")
    power: PowerContext | None
    sensor: SensorContext
    assumptions: list[Assumption] = Field(default_factory=list)


class Campaign(BaseModel):
    crop: str
    starts_on: date
    ends_on: date


class Source(BaseModel):
    title: str
    url: str


class Alternative(BaseModel):
    id: str
    rank: int = Field(ge=1)
    score: float = Field(ge=0, le=100)
    campaigns: list[Campaign]
    reasons: list[str]
    limitations: list[str]
    sources: list[Source]


class RecommendationResponse(BaseModel):
    status: Literal["ok", "insufficient_data"]
    mode: Literal["evaluacion", "escenario_demostracion"]
    engine_version: str
    plot_id: UUID
    calculated_at: UtcDatetime
    context: RecommendationContext
    missing: list[MissingItem]
    selected_id: str | None
    alternatives: list[Alternative]
