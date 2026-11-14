"""Tabla public.device: kit ESP32 instalado en una parcela."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.models import Base


class Device(Base):
    __tablename__ = "device"
    __table_args__ = (
        CheckConstraint("length(trim(external_id)) > 0", name="device_external_id_check"),
        CheckConstraint("status IN ('active', 'inactive')", name="device_status_check"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    plot_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("plot.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    external_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    model: Mapped[str | None] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, nullable=False, default="active")
    # SHA-256 de la clave del dispositivo; la clave en claro nunca se guarda.
    secret_hash: Mapped[str | None] = mapped_column(Text)
    installed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )

    plot: Mapped["Plot"] = relationship(back_populates="devices")  # noqa: F821
