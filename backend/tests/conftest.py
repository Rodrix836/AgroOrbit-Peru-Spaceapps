"""Infraestructura de pruebas aislada: SQLite en memoria y JWT firmados localmente.

No se conecta a Supabase ni a la base compartida.
"""

from collections.abc import Callable, Iterator
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import Settings, get_settings
from app.database.models import Base
from app.database.session import get_db_session
from app.main import app

TEST_JWT_SECRET = "test-secret-solo-para-pytest-0123456789abcdef"


def make_token(user_id: UUID, *, email: str = "agricultor@example.com",
               expires_in: timedelta = timedelta(hours=1), secret: str = TEST_JWT_SECRET) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": str(user_id), "email": email, "aud": "authenticated", "role": "authenticated",
         "iat": now, "exp": now + expires_in},
        secret, algorithm="HS256",
    )


@pytest.fixture()
def engine():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _foreign_keys(dbapi_connection, _):
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture()
def db(engine) -> Iterator[Session]:
    with sessionmaker(engine, expire_on_commit=False)() as session:
        yield session


@pytest.fixture()
def client(engine) -> Iterator[TestClient]:
    sessions = sessionmaker(engine, expire_on_commit=False)

    def session_override():
        with sessions() as session:
            yield session

    app.dependency_overrides[get_db_session] = session_override
    app.dependency_overrides[get_settings] = lambda: Settings(
        _env_file=None, supabase_jwt_secret=TEST_JWT_SECRET, supabase_url=None,
    )
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def auth_headers() -> Callable[[UUID], dict[str, str]]:
    return lambda user_id: {"Authorization": f"Bearer {make_token(user_id)}"}


@pytest.fixture()
def owner_id() -> UUID:
    return uuid4()


@pytest.fixture()
def owner_headers(owner_id, auth_headers) -> dict[str, str]:
    return auth_headers(owner_id)


@pytest.fixture()
def test_plot(client, owner_headers) -> dict:
    """Parcela de prueba: piloto en Sullana, Piura."""
    response = client.post("/api/users/me", json={"display_name": "Agricultor Sullana"}, headers=owner_headers)
    assert response.status_code == 201, response.text
    response = client.post("/api/plots", json={
        "name": "Parcela piloto Sullana", "latitude": -4.90, "longitude": -80.70,
        "area_ha": 1.5, "water_availability": "medium", "priority": "save_water",
    }, headers=owner_headers)
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture()
def test_device(client, owner_headers, test_plot) -> dict:
    response = client.post(
        f"/api/plots/{test_plot['id']}/devices",
        json={"external_id": "esp32-sullana-01", "model": "ESP32 + HW-390 + DS18B20"},
        headers=owner_headers,
    )
    assert response.status_code == 201, response.text
    return response.json()
