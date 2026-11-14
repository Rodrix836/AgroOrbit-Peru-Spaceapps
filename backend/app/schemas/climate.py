"""Respuesta climática diaria de NASA POWER para una parcela."""

from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class ClimateRecord(BaseModel):
    fecha: date
    temperatura_c: float | None
    precipitacion_mm_dia: float | None
    fuente: Literal["NASA POWER"]


class ClimateIndicators(BaseModel):
    temperatura_promedio_c: float | None
    temperatura_maxima_diaria_c: float | None
    temperatura_minima_diaria_c: float | None
    precipitacion_total_mm: float | None
    dias_analizados: int = Field(ge=0)
    dias_temperatura_validos: int = Field(ge=0)
    dias_precipitacion_validos: int = Field(ge=0)
    cobertura_temperatura_pct: float = Field(ge=0, le=100)
    cobertura_precipitacion_pct: float = Field(ge=0, le=100)


class PlotClimateRead(BaseModel):
    plot_id: UUID
    latitude: float
    longitude: float
    fecha_inicio: date
    fecha_fin: date
    fuente: Literal["NASA POWER"]
    registros: list[ClimateRecord]
    indicadores: ClimateIndicators
