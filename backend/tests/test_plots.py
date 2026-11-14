"""Autenticación, perfil, parcelas, CORS y formato de errores."""

from datetime import timedelta
from uuid import uuid4

from conftest import make_token


def assert_error(response, status: int, code: str | None = None) -> dict:
    assert response.status_code == status, response.text
    body = response.json()
    assert set(body) == {"error"}
    assert set(body["error"]) == {"code", "message", "details"}
    if code:
        assert body["error"]["code"] == code
    return body["error"]


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_cors_allows_vite_dev_origin(client):
    response = client.options("/api/plots", headers={
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Authorization",
    })
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_requires_token(client):
    assert_error(client.get("/api/plots"), 401, "missing_token")


def test_rejects_token_with_wrong_signature(client):
    token = make_token(uuid4(), secret="otro-secreto-que-no-es-el-del-proyecto-123456")
    assert_error(client.get("/api/plots", headers={"Authorization": f"Bearer {token}"}), 401, "invalid_token")


def test_rejects_expired_token(client):
    token = make_token(uuid4(), expires_in=timedelta(minutes=-5))
    assert_error(client.get("/api/plots", headers={"Authorization": f"Bearer {token}"}), 401, "token_expired")


def test_rejects_garbage_token(client):
    assert_error(client.get("/api/plots", headers={"Authorization": "Bearer abc.def"}), 401, "invalid_token")


def test_profile_upsert_creates_then_updates(client, owner_headers):
    created = client.post("/api/users/me", json={"display_name": "  Rosa  "}, headers=owner_headers)
    assert created.status_code == 201
    assert created.json()["display_name"] == "Rosa"
    updated = client.post("/api/users/me", json={"display_name": "Rosa Quispe"}, headers=owner_headers)
    assert updated.status_code == 200
    assert updated.json()["id"] == created.json()["id"]
    assert client.get("/api/users/me", headers=owner_headers).json()["display_name"] == "Rosa Quispe"


def test_create_plot_requires_profile(client, owner_headers):
    response = client.post("/api/plots", json={"name": "P", "latitude": -4.9, "longitude": -80.7},
                           headers=owner_headers)
    assert_error(response, 404, "profile_not_found")


def test_create_list_and_get_plot(client, owner_headers, test_plot):
    assert test_plot["latitude"] == -4.9 and test_plot["longitude"] == -80.7
    listed = client.get("/api/plots", headers=owner_headers)
    assert listed.status_code == 200
    assert [p["id"] for p in listed.json()] == [test_plot["id"]]
    detail = client.get(f"/api/plots/{test_plot['id']}", headers=owner_headers)
    assert detail.status_code == 200
    assert detail.json()["name"] == "Parcela piloto Sullana"


def test_plot_validation_error_format(client, owner_headers):
    client.post("/api/users/me", json={"display_name": "Rosa"}, headers=owner_headers)
    response = client.post("/api/plots", json={"name": "", "latitude": -120, "longitude": -80.7},
                           headers=owner_headers)
    error = assert_error(response, 422, "validation_error")
    fields = {d["field"] for d in error["details"]}
    assert {"body.name", "body.latitude"} <= fields
    assert all("input" not in d for d in error["details"])


def test_foreign_plot_is_not_found(client, auth_headers, test_plot):
    intruder = auth_headers(uuid4())
    client.post("/api/users/me", json={"display_name": "Otro"}, headers=intruder)
    assert_error(client.get(f"/api/plots/{test_plot['id']}", headers=intruder), 404, "plot_not_found")
    assert client.get("/api/plots", headers=intruder).json() == []
    assert_error(client.post(f"/api/plots/{test_plot['id']}/devices", json={"external_id": "x"},
                             headers=intruder), 404, "plot_not_found")
    assert_error(client.get(f"/api/plots/{test_plot['id']}/sensors/readings", headers=intruder),
                 404, "plot_not_found")


def test_unknown_plot_and_bad_uuid(client, owner_headers, test_plot):
    assert_error(client.get(f"/api/plots/{uuid4()}", headers=owner_headers), 404, "plot_not_found")
    assert_error(client.get("/api/plots/no-es-uuid", headers=owner_headers), 422, "validation_error")


def test_unknown_route_uses_error_format(client):
    assert_error(client.get("/api/no-existe"), 404, "not_found")


def test_device_key_shown_once_and_only_hash_stored(client, db, owner_headers, test_plot, test_device):
    from app.database.models import Device
    from app.services.sensor_service import hash_device_key

    key = test_device["device_key"]
    assert key.startswith("aok_") and len(key) > 40
    stored = db.get(Device, __import__("uuid").UUID(test_device["id"]))
    assert stored.secret_hash == hash_device_key(key)
    assert key not in (stored.secret_hash or "")

    listed = client.get(f"/api/plots/{test_plot['id']}/devices", headers=owner_headers)
    assert listed.status_code == 200
    assert "device_key" not in listed.json()[0]
    assert "secret_hash" not in listed.json()[0]


def test_duplicate_device_external_id(client, owner_headers, test_plot, test_device):
    response = client.post(f"/api/plots/{test_plot['id']}/devices",
                           json={"external_id": "esp32-sullana-01"}, headers=owner_headers)
    assert_error(response, 409, "device_already_exists")


def test_unexpected_error_hides_internals(client, owner_headers, monkeypatch):
    from app.api.routes import plots as plots_routes

    def boom(*args, **kwargs):
        raise RuntimeError("postgresql://usuario:clave-secreta@host/db")

    monkeypatch.setattr(plots_routes, "select", boom)
    response = client.get("/api/plots", headers=owner_headers)
    error = assert_error(response, 500, "internal_error")
    assert "clave-secreta" not in response.text and "Traceback" not in response.text
    assert error["details"] is None
