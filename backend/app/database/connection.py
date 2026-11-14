"""Creación diferida del motor SQLAlchemy (Supabase PostgreSQL o SQLite local)."""

from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.engine import URL, make_url

from app.core.config import get_settings
from app.core.exceptions import ServiceUnavailableError


def normalize_database_url(database_url: str) -> URL:
    """Usa psycopg 3 con la URL postgresql:// que entrega Supabase."""
    url = make_url(database_url)
    if url.drivername in ("postgresql", "postgres"):
        return url.set(drivername="postgresql+psycopg")
    return url


def make_engine(database_url: str) -> Engine:
    url = normalize_database_url(database_url)
    connect_args = {"check_same_thread": False} if url.get_backend_name() == "sqlite" else {}
    return create_engine(url, pool_pre_ping=True, connect_args=connect_args)


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    database_url = get_settings().database_url
    if not database_url:
        raise ServiceUnavailableError(
            "La base de datos no está configurada.", code="database_not_configured",
        )
    return make_engine(database_url)
