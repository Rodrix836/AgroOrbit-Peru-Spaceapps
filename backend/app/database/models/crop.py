"""Tablas public.crop y public.crop_cycle.

Reflejan supabase/migrations/20261114222638_create_crop_cycles.sql (no la reemplazan).
Una parcela admite un solo ciclo 'active' y un solo ciclo 'planned'; 'finished' sin límite.
"""

from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    String,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database.models import Base

CYCLE_STATUSES = ("active", "finished", "planned")
CYCLE_ORIGINS = ("farmer", "recommendation")


class Crop(Base):
    __tablename__ = "crop"

    code: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)


class CropCycle(Base):
    __tablename__ = "crop_cycle"
    __table_args__ = (
        CheckConstraint("status in ('active', 'finished', 'planned')", name="crop_cycle_status_check"),
        CheckConstraint("origin in ('farmer', 'recommendation')", name="crop_cycle_origin_check"),
        CheckConstraint(
            "(status = 'planned' and sowing_date is not null)"
            " or (status in ('active', 'finished') and crop_code is not null)",
            name="crop_cycle_required_fields",
        ),
        CheckConstraint(
            "harvest_date is null or sowing_date is null or harvest_date >= sowing_date",
            name="crop_cycle_dates_in_order",
        ),
        Index("crop_cycle_plot_status_idx", "plot_id", "status"),
        Index("crop_cycle_one_active_per_plot_idx", "plot_id", unique=True,
              postgresql_where=text("status = 'active'"), sqlite_where=text("status = 'active'")),
        Index("crop_cycle_one_planned_per_plot_idx", "plot_id", unique=True,
              postgresql_where=text("status = 'planned'"), sqlite_where=text("status = 'planned'")),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    plot_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("plot.id", ondelete="CASCADE"), nullable=False,
    )
    crop_code: Mapped[str | None] = mapped_column(String, ForeignKey("crop.code", ondelete="RESTRICT"))
    sowing_date: Mapped[date | None] = mapped_column(Date)
    harvest_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String, nullable=False)
    origin: Mapped[str] = mapped_column(String, nullable=False, default="farmer")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
