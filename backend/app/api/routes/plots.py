"""Parcelas del usuario, registro de dispositivos e historial de lecturas."""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, OwnedPlot
from app.core.exceptions import BadRequestError, NotFoundError
from app.database.models import AppUser, Device, Plot, SensorReading
from app.schemas.common import as_utc
from app.schemas.device import DeviceCreate, DeviceRead, DeviceRegistered
from app.schemas.plot import PlotCreate, PlotRead
from app.schemas.sensor import SensorReadingRead, SensorType
from app.services import sensor_service

router = APIRouter(prefix="/plots", tags=["Parcelas"])


@router.post("", response_model=PlotRead, status_code=201)
def create_plot(body: PlotCreate, user: CurrentUser, session: DbSession) -> Plot:
    profile = session.scalar(select(AppUser).where(AppUser.auth_user_id == user.id))
    if profile is None:
        raise NotFoundError("Primero registra tu perfil con POST /api/users/me.", code="profile_not_found")
    plot = Plot(user_id=profile.id, **body.model_dump())
    session.add(plot)
    session.commit()
    session.refresh(plot)
    return plot


@router.get("", response_model=list[PlotRead])
def list_my_plots(user: CurrentUser, session: DbSession) -> list[Plot]:
    return list(session.scalars(
        select(Plot)
        .join(AppUser, AppUser.id == Plot.user_id)
        .where(AppUser.auth_user_id == user.id)
        .order_by(Plot.created_at.desc(), Plot.name)
    ))


@router.get("/{plot_id}", response_model=PlotRead)
def get_plot(plot: OwnedPlot) -> Plot:
    return plot


@router.post("/{plot_id}/devices", response_model=DeviceRegistered, status_code=201, tags=["Dispositivos"])
def register_device(plot: OwnedPlot, body: DeviceCreate, session: DbSession) -> DeviceRegistered:
    """Registra un kit ESP32. La clave `device_key` solo se muestra en esta respuesta."""
    device, device_key = sensor_service.register_device(session, plot, body)
    return DeviceRegistered(**DeviceRead.model_validate(device).model_dump(), device_key=device_key)


@router.get("/{plot_id}/devices", response_model=list[DeviceRead], tags=["Dispositivos"])
def list_devices(plot: OwnedPlot, session: DbSession) -> list[Device]:
    return list(session.scalars(
        select(Device).where(Device.plot_id == plot.id).order_by(Device.created_at, Device.external_id)
    ))


@router.get("/{plot_id}/sensors/readings", response_model=list[SensorReadingRead], tags=["Lecturas"])
def list_readings(
    plot: OwnedPlot,
    session: DbSession,
    date_from: Annotated[datetime | None, Query(alias="from", description="Desde (ISO 8601, UTC si no trae zona)")] = None,
    date_to: Annotated[datetime | None, Query(alias="to", description="Hasta (ISO 8601, UTC si no trae zona)")] = None,
    sensor_type: SensorType | None = None,
    limit: Annotated[int, Query(ge=1, le=1000)] = 500,
) -> list[SensorReading]:
    """Historial ordenado por fecha ascendente (las `limit` más recientes del rango)."""
    date_from = as_utc(date_from) if date_from else None
    date_to = as_utc(date_to) if date_to else None
    if date_from and date_to and date_from > date_to:
        raise BadRequestError("'from' debe ser anterior o igual a 'to'.", code="invalid_date_range")
    return sensor_service.list_plot_readings(
        session, plot.id,
        date_from=date_from, date_to=date_to, sensor_type=sensor_type, limit=limit,
    )
