"""Esquemas de registro de dispositivos ESP32."""

from typing import Annotated
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, StringConstraints

from app.schemas.common import UtcDatetime

ExternalId = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_.:-]+$"),
]


class DeviceCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    external_id: ExternalId = Field(description="Identificador del kit, p. ej. su MAC o 'esp32-sullana-01'.")
    model: str | None = Field(default=None, max_length=120)
    installed_at: AwareDatetime | None = None


class DeviceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    plot_id: UUID
    external_id: str
    model: str | None
    status: str
    installed_at: UtcDatetime | None
    created_at: UtcDatetime


class DeviceRegistered(DeviceRead):
    """Respuesta única del registro: incluye la clave en claro una sola vez."""

    device_key: str = Field(description="Enviar en la cabecera X-Device-Key. No se vuelve a mostrar.")
