"""Tabla public.nasa_observation: un valor diario de NASA POWER por parcela y variable.

Refleja supabase/migrations/20261114204035_create_nasa_observation.sql (no la reemplaza).
"""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database.models import Base

NASA_SOURCE = "NASA POWER"
NASA_TIME_STANDARD = "LST"
NASA_UNITS = {"T2M": "C", "PRECTOTCORR": "mm/day"}


class NasaObservation(Base):
    __tablename__ = "nasa_observation"
    __table_args__ = (
        UniqueConstraint("plot_id", "variable", "observed_on", name="nasa_observation_plot_variable_date_key"),
        CheckConstraint("variable in ('T2M', 'PRECTOTCORR')", name="nasa_observation_variable_check"),
        CheckConstraint(
            "(variable = 'T2M' and unit = 'C' and (value is null or (value > -900 and value < 900)))"
            " or (variable = 'PRECTOTCORR' and unit = 'mm/day' and (value is null or value >= 0))",
            name="nasa_observation_valid_measurement",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    plot_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("plot.id", ondelete="CASCADE"), nullable=False,
    )
    variable: Mapped[str] = mapped_column(String, nullable=False)
    observed_on: Mapped[date] = mapped_column(Date, nullable=False)
    value: Mapped[Decimal | None] = mapped_column(Numeric(14, 5))
    unit: Mapped[str] = mapped_column(String, nullable=False)
    source: Mapped[str] = mapped_column(String, nullable=False, default=NASA_SOURCE)
    time_standard: Mapped[str] = mapped_column(String, nullable=False, default=NASA_TIME_STANDARD)
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
