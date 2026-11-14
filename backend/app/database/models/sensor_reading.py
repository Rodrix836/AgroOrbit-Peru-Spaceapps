"""Tabla public.sensor_reading: lectura cruda y calibrada de un sensor.

En la base las columnas son variable / observed_at; la API las expone como
sensor_type / recorded_at (ver app/schemas/sensor.py).
"""

from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database.models import Base


class SensorReading(Base):
    __tablename__ = "sensor_reading"
    __table_args__ = (
        CheckConstraint("length(trim(variable)) > 0", name="sensor_reading_variable_check"),
        UniqueConstraint("device_id", "variable", "observed_at", name="sensor_reading_unique_value"),
        Index("sensor_reading_device_time_idx", "device_id", "observed_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    device_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("device.id", ondelete="CASCADE"), nullable=False,
    )
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    variable: Mapped[str] = mapped_column(String, nullable=False)
    raw_value: Mapped[Decimal] = mapped_column(Numeric(14, 5), nullable=False)
    calibrated_value: Mapped[Decimal | None] = mapped_column(Numeric(14, 5))
    unit: Mapped[str] = mapped_column(String, nullable=False)
    quality_flag: Mapped[str | None] = mapped_column(String)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
