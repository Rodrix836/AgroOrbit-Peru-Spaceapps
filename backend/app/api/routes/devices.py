"""Ingesta de lecturas enviadas por el ESP32 (autenticado con X-Device-Key)."""

from typing import Annotated

from fastapi import APIRouter, Header

from app.api.deps import DbSession
from app.schemas.sensor import ReadingsAccepted, ReadingsBatch, SensorReadingRead
from app.services import sensor_service

router = APIRouter(prefix="/devices", tags=["Lecturas"])


@router.post("/readings", response_model=ReadingsAccepted, status_code=201)
def receive_readings(
    body: ReadingsBatch,
    session: DbSession,
    x_device_key: Annotated[str | None, Header(alias="X-Device-Key")] = None,
) -> ReadingsAccepted:
    """Guarda el lote completo o nada; 409 si alguna lectura ya existía."""
    device = sensor_service.authenticate_device(session, x_device_key)
    rows = sensor_service.ingest_readings(session, device, body.readings)
    return ReadingsAccepted(
        device_id=device.id,
        inserted=len(rows),
        readings=[SensorReadingRead.model_validate(row) for row in rows],
    )
