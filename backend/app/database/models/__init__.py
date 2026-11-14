"""Modelos ORM de la parte de API: usuarios, parcelas, dispositivos y lecturas.

Reflejan las migraciones de supabase/migrations (no las reemplazan): las tablas
se crean con Supabase CLI. Aquí solo se mapean las columnas que usa la API.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


from app.database.models.device import Device  # noqa: E402
from app.database.models.plot import Plot  # noqa: E402
from app.database.models.sensor_reading import SensorReading  # noqa: E402
from app.database.models.user import AppUser  # noqa: E402

__all__ = ["Base", "AppUser", "Plot", "Device", "SensorReading"]
