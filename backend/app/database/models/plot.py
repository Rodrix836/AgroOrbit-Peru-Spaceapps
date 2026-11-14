"""Tabla public.plot: parcela registrada por el agricultor."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.models import Base


class Plot(Base):
    __tablename__ = "plot"
    __table_args__ = (
        CheckConstraint("latitude BETWEEN -90 AND 90", name="plot_latitude_range"),
        CheckConstraint("longitude BETWEEN -180 AND 180", name="plot_longitude_range"),
        CheckConstraint("area_ha > 0", name="plot_area_ha_check"),
        CheckConstraint(
            "water_availability IN ('low', 'medium', 'high')", name="plot_water_availability_check",
        ),
        CheckConstraint("soil_ph BETWEEN 0 AND 14", name="plot_soil_ph_check"),
        CheckConstraint("soil_salinity_ds_m >= 0", name="plot_soil_salinity_ds_m_check"),
        CheckConstraint(
            "priority IN ('save_water', 'improve_soil', 'reduce_climate_risk', "
            "'diversify', 'maintain_productivity')",
            name="plot_priority_check",
        ),
        CheckConstraint("lgrip_class BETWEEN 0 AND 3", name="plot_lgrip_class_check"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    area_ha: Mapped[Decimal | None] = mapped_column(Numeric(12, 4))
    water_source: Mapped[str | None] = mapped_column(String)
    water_availability: Mapped[str | None] = mapped_column(String)
    soil_texture: Mapped[str | None] = mapped_column(String)
    soil_ph: Mapped[Decimal | None] = mapped_column(Numeric(4, 2))
    soil_salinity_ds_m: Mapped[Decimal | None] = mapped_column(Numeric(8, 3))
    priority: Mapped[str | None] = mapped_column(String)
    declared_irrigated: Mapped[bool | None] = mapped_column(Boolean)
    lgrip_class: Mapped[int | None] = mapped_column(Integer)
    lgrip_year: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )

    user: Mapped["AppUser"] = relationship(back_populates="plots")  # noqa: F821
    devices: Mapped[list["Device"]] = relationship(back_populates="plot")  # noqa: F821
