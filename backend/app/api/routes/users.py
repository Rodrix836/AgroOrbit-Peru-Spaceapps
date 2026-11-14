"""Perfil del usuario autenticado."""

from fastapi import APIRouter, Response, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.core.exceptions import NotFoundError
from app.database.models import AppUser
from app.schemas.user import UserProfileRead, UserProfileUpsert

router = APIRouter(prefix="/users", tags=["Usuarios"])


@router.post(
    "/me",
    response_model=UserProfileRead,
    responses={201: {"description": "Perfil creado"}, 200: {"description": "Perfil actualizado"}},
)
def upsert_my_profile(
    body: UserProfileUpsert, user: CurrentUser, session: DbSession, response: Response,
) -> AppUser:
    """Registra el perfil (201) o actualiza el nombre si ya existe (200)."""
    profile = session.scalar(select(AppUser).where(AppUser.auth_user_id == user.id))
    if profile is None:
        profile = AppUser(auth_user_id=user.id, display_name=body.display_name)
        session.add(profile)
        response.status_code = status.HTTP_201_CREATED
    else:
        profile.display_name = body.display_name
    session.commit()
    session.refresh(profile)
    return profile


@router.get("/me", response_model=UserProfileRead)
def get_my_profile(user: CurrentUser, session: DbSession) -> AppUser:
    profile = session.scalar(select(AppUser).where(AppUser.auth_user_id == user.id))
    if profile is None:
        raise NotFoundError("Primero registra tu perfil con POST /api/users/me.", code="profile_not_found")
    return profile
