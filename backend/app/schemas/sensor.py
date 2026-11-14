"""Contratos de lecturas del kit ESP32 (HW-390 humedad de suelo, DS18B20 temperatura).

API            <-> columna en sensor_reading
sensor_type    <-> variable
recorded_at    <-> observed_at
"""

from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import UUID

from pydantic import (
    AliasChoices,
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from app.schemas.common import UtcDatetime

SensorType = Literal["soil_moisture", "soil_temperature"]
QualityFlag = Literal["ok", "clamped_dry", "clamped_wet", "suspect"]

# Unidad y rangos aceptados por tipo de sensor.
SENSOR_RULES: dict[str, dict] = {
    # HW-390: ADC de 12 bits del ESP32; calibrado como % seco/húmedo.
    "soil_moisture": {"unit": "%", "raw": (0, 4095), "calibrated": (0, 100)},
    # DS18B20: rango de operación del sensor en °C.
    "soil_temperature": {"unit": "°C", "raw": (-55, 125), "calibrated": (-55, 125)},
}

MAX_FUTURE_SKEW = timedelta(minutes=5)

class ReadingIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sensor_type: SensorType
    raw_value: float = Field(allow_inf_nan=False)
    calibrated_value: float = Field(allow_inf_nan=False)
    unit: str
    recorded_at: AwareDatetime = Field(description="ISO 8601 con zona horaria; se normaliza a UTC.")
    quality_flag: QualityFlag = "ok"

    @field_validator("recorded_at")
    @classmethod
    def recorded_at_utc(cls, value: datetime) -> datetime:
        value = value.astimezone(timezone.utc)
        if value > datetime.now(timezone.utc) + MAX_FUTURE_SKEW:
            raise ValueError("recorded_at no puede estar en el futuro.")
        return value

    @model_validator(mode="after")
    def check_ranges(self) -> "ReadingIn":
        rules = SENSOR_RULES[self.sensor_type]
        if self.unit != rules["unit"]:
            raise ValueError(f"La unidad de {self.sensor_type} debe ser '{rules['unit']}'.")
        low, high = rules["raw"]
        if not low <= self.raw_value <= high:
            raise ValueError(f"raw_value de {self.sensor_type} debe estar entre {low} y {high}.")
        low, high = rules["calibrated"]
        if not low <= self.calibrated_value <= high:
            raise ValueError(f"calibrated_value de {self.sensor_type} debe estar entre {low} y {high}.")
        return self

class ReadingsBatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    readings: list[ReadingIn] = Field(min_length=1, max_length=50)

class Esp32Sample(BaseModel):
    """Formato plano del firmware con hora asignada por el servidor."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    device_id: str = Field(min_length=1, max_length=120)
    soil_moisture_pct: float = Field(strict=True, ge=0, le=100, allow_inf_nan=False)
    soil_moisture_raw: int = Field(strict=True, ge=0, le=4095)
    soil_temp_c: float = Field(strict=True, ge=-55, le=125, allow_inf_nan=False)


class SensorReadingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    device_id: UUID
    sensor_type: str = Field(validation_alias=AliasChoices("variable", "sensor_type"))
    raw_value: float
    calibrated_value: float | None
    unit: str
    quality_flag: str | None
    recorded_at: UtcDatetime = Field(validation_alias=AliasChoices("observed_at", "recorded_at"))
    received_at: UtcDatetime

class ReadingsAccepted(BaseModel):
    device_id: UUID
    inserted: int
    readings: list[SensorReadingRead]
