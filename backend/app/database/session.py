"""Sesiones transaccionales por solicitud."""

from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy.orm import Session, sessionmaker

from app.database.connection import get_engine


@lru_cache(maxsize=1)
def get_session_factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), expire_on_commit=False)


def get_db_session() -> Iterator[Session]:
    """Dependencia FastAPI: cada servicio decide cuándo confirmar."""
    with get_session_factory()() as session:
        yield session
