"""Campañas de cultivo registradas para una parcela."""

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

ACTIVE_INDEX_NAME = "crop_cycle_one_active_per_plot_idx"


class CropCycle(Base):
    __tablename__ = "crop_cycle"
    __table_args__ = (
        CheckConstraint("start_on <= end_on", name="crop_cycle_date_order"),
        CheckConstraint(
            "status IN ('planned', 'active', 'completed')",
            name="crop_cycle_status_check",
        ),
        Index(
            ACTIVE_INDEX_NAME,
            "plot_id",
            unique=True,
            postgresql_where=text("status = 'active'"),
            sqlite_where=text("status = 'active'"),
        ),
        Index("crop_cycle_plot_dates_idx", "plot_id", "start_on", "end_on"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    plot_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("plot.id", ondelete="CASCADE"), nullable=False,
    )
    crop_id: Mapped[str] = mapped_column(String(64), nullable=False)
    start_on: Mapped[date] = mapped_column(Date, nullable=False)
    end_on: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="planned")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
