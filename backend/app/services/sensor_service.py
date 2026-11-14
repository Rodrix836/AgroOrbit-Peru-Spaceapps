"""Dispositivos ESP32: registro con clave de un solo uso visible, ingesta e historial."""

import hashlib
import hmac
import secrets
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, tuple_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, ForbiddenError, UnauthorizedError
from app.database.models import Device, Plot, SensorReading
from app.schemas.common import as_utc
from app.schemas.device import DeviceCreate
from app.schemas.sensor import ReadingIn

DEVICE_KEY_PREFIX = "aok_"


def hash_device_key(device_key: str) -> str:
    return hashlib.sha256(device_key.encode("utf-8")).hexdigest()


def generate_device_key() -> str:
    # 256 bits aleatorios; el prefijo ayuda a reconocer la clave en logs del firmware.
    return DEVICE_KEY_PREFIX + secrets.token_urlsafe(32)


def register_device(session: Session, plot: Plot, data: DeviceCreate) -> tuple[Device, str]:
    """Crea el dispositivo y devuelve (device, clave_en_claro). Solo se guarda el hash."""
    if session.scalar(select(Device.id).where(Device.external_id == data.external_id)) is not None:
        raise ConflictError("Ya existe un dispositivo con ese external_id.", code="device_already_exists")

    device_key = generate_device_key()
    device = Device(
        plot_id=plot.id,
        external_id=data.external_id,
        model=data.model,
        installed_at=data.installed_at,
        status="active",
        secret_hash=hash_device_key(device_key),
    )
    session.add(device)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise ConflictError(
            "Ya existe un dispositivo con ese external_id.", code="device_already_exists",
        ) from exc
    session.refresh(device)
    return device, device_key


def authenticate_device(session: Session, device_key: str | None) -> Device:
    """401 si falta o no coincide la clave; 403 si el dispositivo está inactivo."""
    if not device_key or not device_key.strip():
        raise UnauthorizedError("Falta la cabecera X-Device-Key.", code="missing_device_key")

    supplied_hash = hash_device_key(device_key.strip())
    device = session.scalar(select(Device).where(Device.secret_hash == supplied_hash))
    # Comparación en tiempo constante como defensa adicional.
    if device is None or not device.secret_hash or not hmac.compare_digest(device.secret_hash, supplied_hash):
        raise UnauthorizedError("Clave de dispositivo inválida.", code="invalid_device_key")
    if device.status != "active":
        raise ForbiddenError("El dispositivo está desactivado.", code="device_inactive")
    return device


def _duplicate_details(rows: list[tuple[str, datetime]]) -> list[dict[str, str]]:
    return [
        {"sensor_type": sensor_type, "recorded_at": as_utc(recorded_at).isoformat().replace("+00:00", "Z")}
        for sensor_type, recorded_at in rows
    ]


def ingest_readings(session: Session, device: Device, readings: list[ReadingIn]) -> list[SensorReading]:
    """Inserta el lote completo o nada. Rechaza duplicados (mismo tipo y fecha) con 409."""
    keys = [(r.sensor_type, r.recorded_at) for r in readings]

    repeated = sorted({k for k in keys if keys.count(k) > 1}, key=lambda k: (k[1], k[0]))
    if repeated:
        raise ConflictError(
            "El lote contiene lecturas repetidas.", code="duplicate_reading",
            details=_duplicate_details(repeated),
        )

    existing = session.execute(
        select(SensorReading.variable, SensorReading.observed_at).where(
            SensorReading.device_id == device.id,
            tuple_(SensorReading.variable, SensorReading.observed_at).in_(keys),
        )
    ).all()
    if existing:
        raise ConflictError(
            "La lectura ya fue registrada para este dispositivo.", code="duplicate_reading",
            details=_duplicate_details([(row[0], row[1]) for row in existing]),
        )

    received_at = datetime.now(timezone.utc)
    rows = [
        SensorReading(
            device_id=device.id,
            variable=r.sensor_type,
            observed_at=r.recorded_at,
            raw_value=r.raw_value,
            calibrated_value=r.calibrated_value,
            unit=r.unit,
            quality_flag=r.quality_flag,
            received_at=received_at,
        )
        for r in readings
    ]
    session.add_all(rows)
    try:
        session.commit()
    except IntegrityError as exc:
        # Otra petición insertó la misma lectura entre la comprobación y el commit.
        session.rollback()
        raise ConflictError(
            "La lectura ya fue registrada para este dispositivo.", code="duplicate_reading",
        ) from exc
    return rows


def list_plot_readings(
    session: Session,
    plot_id: UUID,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    sensor_type: str | None = None,
    limit: int = 500,
) -> list[SensorReading]:
    """Las `limit` lecturas más recientes del rango, devueltas en orden cronológico ascendente."""
    query = (
        select(SensorReading)
        .join(Device, Device.id == SensorReading.device_id)
        .where(Device.plot_id == plot_id)
    )
    if date_from is not None:
        query = query.where(SensorReading.observed_at >= date_from)
    if date_to is not None:
        query = query.where(SensorReading.observed_at <= date_to)
    if sensor_type is not None:
        query = query.where(SensorReading.variable == sensor_type)

    latest = session.scalars(
        query.order_by(SensorReading.observed_at.desc(), SensorReading.variable).limit(limit)
    ).all()
    return list(reversed(latest))
