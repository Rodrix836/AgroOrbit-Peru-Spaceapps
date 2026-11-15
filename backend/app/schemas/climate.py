"""Respuesta climática diaria de NASA POWER para una parcela."""

from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import UtcDatetime


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
    time_standard: Literal["LST"] = "LST"
    unidades: dict[str, str] = Field(
        default_factory=lambda: {"temperatura_c": "C", "precipitacion_mm_dia": "mm/day"},
        description="Unidades de POWER para cada campo de registros.",
    )
    registros: list[ClimateRecord]
    indicadores: ClimateIndicators


# --- Persistencia en public.nasa_observation --------------------------------------------

NasaVariable = Literal[
    "T2M", "PRECTOTCORR", "T2M_MAX", "T2M_MIN", "RH2M", "WS2M", "ALLSKY_SFC_SW_DWN", "GWETTOP", "GWETROOT",
]


class NasaImportRequest(BaseModel):
    """Cuerpo opcional de POST /api/plots/{plot_id}/nasa/power. Sin fechas: últimos 90 días."""

    model_config = ConfigDict(extra="forbid")

    start: date | None = Field(default=None, description="Primer día (LST), inclusivo")
    end: date | None = Field(default=None, description="Último día (LST), inclusivo; por defecto hoy")


class NasaImportResult(BaseModel):
    plot_id: UUID
    latitude: float
    longitude: float
    start: date
    end: date
    source: Literal["NASA POWER"]
    time_standard: Literal["LST"]
    variables: list[NasaVariable]
    unidades: dict[str, str]
    dias: int = Field(ge=0)
    filas_guardadas: int = Field(ge=0)
    valores_faltantes: int = Field(ge=0)
    fetched_at: UtcDatetime


class NasaObservationRead(BaseModel):
    """Igual que NasaObservation de frontend/src/types/api.ts."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    variable: str
    observed_on: date
    value: float | None
    unit: str
    source: str
