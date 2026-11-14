"""Contrato de solicitud y respuesta para recomendar rotaciones."""

from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

RecommendationPriority = Literal["save_water", "improve_soil"]


class RecommendationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    plot_id: UUID
    priority: RecommendationPriority
    start_on: date
    horizon_days: int = Field(gt=0)


class MissingRecommendationData(BaseModel):
    field: str
    reason: str


class RecommendationSource(BaseModel):
    title: str
    url: str


class RecommendationCampaign(BaseModel):
    crop: str
    starts_on: date
    ends_on: date


class RecommendationAlternative(BaseModel):
    id: str
    rank: int = Field(ge=1, le=3)
    score: float = Field(ge=0, le=100)
    campaigns: list[RecommendationCampaign] = Field(min_length=2, max_length=2)
    reasons: list[str]
    limitations: list[str]
    sources: list[RecommendationSource]


class RecommendationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok", "insufficient_data"]
    engine_version: Literal["1.0"] = "1.0"
    selected_id: str | None
    alternatives: list[RecommendationAlternative] = Field(max_length=3)
    missing: list[MissingRecommendationData]

    @model_validator(mode="after")
    def status_matches_result(self) -> "RecommendationResponse":
        if self.status == "ok":
            alternative_ids = {alternative.id for alternative in self.alternatives}
            if not self.alternatives or self.selected_id not in alternative_ids or self.missing:
                raise ValueError("Una respuesta ok requiere alternativas seleccionadas y sin faltantes.")
        elif self.selected_id is not None or self.alternatives or not self.missing:
            raise ValueError("Una respuesta insufficient_data requiere faltantes y no admite alternativas.")
        return self
