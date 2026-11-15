"""Tabla public.nasa_observation: un valor diario de NASA POWER por parcela y variable.

Refleja supabase/migrations/20261114204035_create_nasa_observation.sql y
20261115161101_allow_nasa_soil_wetness.sql (no las reemplaza). Para añadir una variable hace falta
primero una migración que la admita: si la API guarda una variable que la tabla no acepta, la
importación entera falla.
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
# Variable de POWER -> unidad que declara POWER (se verifica al importar).
NASA_UNITS = {
    "T2M": "C",
    "PRECTOTCORR": "mm/day",
    "GWETTOP": "1",
    "GWETROOT": "1",
}
# Rango válido por unidad (mismo criterio que el check de la tabla): (mínimo, máximo, inclusivo).
NASA_UNIT_RANGES = {
    "C": (-900, 900, False),
    "mm/day": (0, None, True),
    "1": (0, 1, True),
}


def nasa_value_is_valid(variable: str, value: float) -> bool:
    low, high, inclusive = NASA_UNIT_RANGES[NASA_UNITS[variable]]
    if (value < low) if inclusive else (value <= low):
        return False
    return high is None or (value <= high if inclusive else value < high)


_VARIABLES_SQL = ", ".join(f"'{v}'" for v in NASA_UNITS)
_VALID_MEASUREMENT_SQL = (
    "(variable = 'T2M' and unit = 'C' and (value is null or (value > -900 and value < 900)))"
    " or (variable = 'PRECTOTCORR' and unit = 'mm/day' and (value is null or value >= 0))"
    " or (variable in ('GWETTOP', 'GWETROOT') and unit = '1'"
    " and (value is null or (value >= 0 and value <= 1)))"
)


class NasaObservation(Base):
    __tablename__ = "nasa_observation"
    __table_args__ = (
        UniqueConstraint("plot_id", "variable", "observed_on", name="nasa_observation_plot_variable_date_key"),
        CheckConstraint(f"variable in ({_VARIABLES_SQL})", name="nasa_observation_variable_check"),
        CheckConstraint(_VALID_MEASUREMENT_SQL, name="nasa_observation_valid_measurement"),
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
