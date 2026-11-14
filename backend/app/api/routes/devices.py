"""Ingesta de lecturas enviadas por el ESP32 (autenticado con X-Device-Key)."""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Header

from app.api.deps import DbSession
from app.core.config import Settings, get_settings
from app.core.exceptions import ForbiddenError
from app.database.models import Device, SensorReading
from app.schemas.sensor import Esp32Sample, ReadingIn, ReadingsAccepted, ReadingsBatch, SensorReadingRead
from app.services import sensor_service

router = APIRouter(prefix="/devices", tags=["Lecturas"])
esp32_router = APIRouter(prefix="/sensors", tags=["Lecturas"])

AppSettings = Annotated[Settings, Depends(get_settings)]


def _is_test_device(device: Device, settings: Settings) -> bool:
    return device.external_id in settings.test_device_ids


@router.post("/readings", response_model=ReadingsAccepted, status_code=201)
def receive_readings(
    body: ReadingsBatch,
    session: DbSession,
    settings: AppSettings,
    x_device_key: Annotated[str | None, Header(alias="X-Device-Key")] = None,
) -> ReadingsAccepted:
    """Guarda el lote completo o nada; 409 si alguna lectura ya existía."""
    device = sensor_service.authenticate_device(session, x_device_key)
    rows = sensor_service.ingest_readings(
        session, device, body.readings, mark_as_test=_is_test_device(device, settings),
    )
    return _accepted(device, rows)


@esp32_router.post("/readings", response_model=ReadingsAccepted, status_code=201)
def receive_esp32_sample(
    body: Esp32Sample,
    session: DbSession,
    settings: AppSettings,
    x_device_key: Annotated[str | None, Header(alias="X-Device-Key")] = None,
) -> ReadingsAccepted:
    """Convierte una muestra del firmware en dos lecturas con la hora de recepción."""
    received_at = datetime.now(timezone.utc)
    device = sensor_service.authenticate_device(session, x_device_key)
    if body.device_id != device.external_id:
        raise ForbiddenError(
            "El identificador del kit no corresponde a la clave.", code="device_id_mismatch",
        )

    readings = [
        ReadingIn(
            sensor_type="soil_moisture", raw_value=body.soil_moisture_raw,
            calibrated_value=body.soil_moisture_pct, unit="%", recorded_at=received_at,
        ),
        ReadingIn(
            sensor_type="soil_temperature", raw_value=body.soil_temp_c,
            calibrated_value=body.soil_temp_c, unit="°C", recorded_at=received_at,
        ),
    ]
    rows = sensor_service.ingest_readings(
        session, device, readings, received_at=received_at,
        mark_as_test=_is_test_device(device, settings),
    )
    return _accepted(device, rows)


def _accepted(device: Device, rows: list[SensorReading]) -> ReadingsAccepted:
    return ReadingsAccepted(
        device_id=device.id,
        inserted=len(rows),
        readings=[SensorReadingRead.model_validate(row) for row in rows],
    )
