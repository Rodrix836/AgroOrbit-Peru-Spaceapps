"""Dependencias compartidas: usuario autenticado, sesión de BD y parcela propia."""

from typing import Annotated
from uuid import UUID

from fastapi import Depends, Path
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.database.models import AppUser, Plot
from app.database.session import get_db_session
from app.services.auth import AuthUser, get_current_user

CurrentUser = Annotated[AuthUser, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db_session)]


def find_owned_plot(session: Session, user: AuthUser, plot_id: UUID) -> Plot:
    """Devuelve la parcela si pertenece al usuario; 404 si no existe o es ajena.

    Se responde 404 (no 403) para no revelar la existencia de parcelas ajenas.
    Útil cuando el plot_id llega en el cuerpo (p. ej. POST /api/recommendations).
    """
    plot = session.scalar(
        select(Plot)
        .join(AppUser, AppUser.id == Plot.user_id)
        .where(Plot.id == plot_id, AppUser.auth_user_id == user.id)
    )
    if plot is None:
        raise NotFoundError("Parcela no encontrada.", code="plot_not_found")
    return plot


def get_owned_plot(
    user: CurrentUser,
    session: DbSession,
    plot_id: Annotated[UUID, Path(description="ID de la parcela")],
) -> Plot:
    return find_owned_plot(session, user, plot_id)


OwnedPlot = Annotated[Plot, Depends(get_owned_plot)]
