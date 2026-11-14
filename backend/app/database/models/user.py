"""Tabla public.app_user: perfil enlazado con Supabase Auth."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.models import Base


class AppUser(Base):
    __tablename__ = "app_user"
    __table_args__ = (
        CheckConstraint("length(trim(display_name)) > 0", name="app_user_display_name_check"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    # En PostgreSQL la migración añade la FK a auth.users; aquí se omite para SQLite.
    auth_user_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), unique=True)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )

    plots: Mapped[list["Plot"]] = relationship(back_populates="user")  # noqa: F821
