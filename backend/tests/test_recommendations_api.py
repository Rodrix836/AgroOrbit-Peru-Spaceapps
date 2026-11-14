"""POST /api/recommendations: contexto real, missing calculado y punto de enganche del motor."""

from copy import deepcopy
from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID, uuid4

from test_plots import assert_error

from app.data import crops as crops_module
from app.database.models import CropCycle, NasaObservation
from app.schemas.recommendation import Alternative, Assumption, Campaign, Source
from app.services import recommendation_service

URL = "/api/recommendations"


def body(plot, **overrides):
    return {"plot_id": plot["id"], "priority": "save_water", "start_on": "2026-12-01",
            "horizon_days": 365, **overrides}


def missing_fields(response):
    return [m["field"] for m in response.json()["missing"]]


def store_power(db, plot, days, end=date(2026, 11, 14), t2m=27.0, prec=1.0):
    for i in range(days):
        day = end - timedelta(days=i)
        for variable, value, unit in (("T2M", t2m, "C"), ("PRECTOTCORR", prec, "mm/day")):
            db.add(NasaObservation(plot_id=UUID(plot["id"]), variable=variable, observed_on=day, value=value,
                                   unit=unit, latitude=Decimal(str(plot["latitude"])),
                                   longitude=Decimal(str(plot["longitude"]))))
    db.commit()


def complete_plot(client, db, owner_headers, plot):
    client.patch(f"/api/plots/{plot['id']}", json={"water_availability": "low", "soil_texture": "franco arenoso"},
                 headers=owner_headers)
    db.add(CropCycle(plot_id=UUID(plot["id"]), crop_code="maiz", status="finished"))
    db.commit()
    store_power(db, plot, recommendation_service.MIN_HISTORY_DAYS)


def complete_catalog(monkeypatch):
    catalog = deepcopy(crops_module.CULTIVOS)
    for crop in catalog.values():
        crop.update(temperatura_min_c=1, temperatura_max_c=2, agua_min_mm_campana=3, agua_max_mm_campana=4,
                    fuentes=[{"title": "Fuente de prueba", "url": "https://example.org"}])
    monkeypatch.setattr(crops_module, "CULTIVOS", catalog)


def test_empty_plot_gives_insufficient_data(client, owner_headers, test_plot):
    # La parcela de conftest trae water_availability; se borra para partir de cero.
    client.patch(f"/api/plots/{test_plot['id']}", json={"water_availability": None}, headers=owner_headers)
    response = client.post(URL, json=body(test_plot), headers=owner_headers)
    assert response.status_code == 200, response.text
    data = response.json()
    assert (data["status"], data["mode"], data["selected_id"], data["alternatives"]) == (
        "insufficient_data", "evaluacion", None, [])
    assert data["plot_id"] == test_plot["id"]
    assert missing_fields(response) == [
        "plot.previous_crop", "plot.water_availability", "plot.soil_texture",
        "crops.maiz.requirements", "crops.frijol_caupi.requirements", "crops.camote.requirements",
        "climate.history",
    ]
    assert all(m["reason"] for m in data["missing"])
    assert data["context"]["power"] is None
    assert data["context"]["sensor"] == {"quality_flag": None, "used_as_evidence": False,
                                         "reason": "La parcela no tiene lecturas del kit."}
    assert data["context"]["assumptions"] == []


def test_context_uses_stored_power_and_test_sensor(client, db, owner_headers, test_plot, test_device):
    store_power(db, test_plot, 14)
    client.post("/api/sensors/readings", headers={"X-Device-Key": test_device["device_key"]}, json={
        "device_id": test_device["external_id"], "soil_moisture_pct": 41.5,
        "soil_moisture_raw": 2100, "soil_temp_c": 27.3})
    # Una lectura de prueba marcada a mano como test (el kit de conftest no está en TEST_DEVICE_EXTERNAL_IDS).
    from app.database.models import SensorReading
    for row in db.query(SensorReading).all():
        row.quality_flag = "test"
    db.commit()

    data = client.post(URL, json=body(test_plot), headers=owner_headers).json()
    power = data["context"]["power"]
    assert (power["start"], power["end"], power["use"]) == ("2026-11-01", "2026-11-14", "contexto_del_periodo")
    assert (power["source"], power["time_standard"]) == ("NASA POWER", "LST")
    assert power["indicators"]["temperatura_promedio_c"] == 27.0 and power["indicators"]["dias_analizados"] == 14
    assert data["context"]["sensor"]["quality_flag"] == "test"
    assert data["context"]["sensor"]["used_as_evidence"] is False
    history = next(m for m in data["missing"] if m["field"] == "climate.history")
    assert "14 días" in history["reason"]


def test_power_after_start_on_is_not_used(client, db, owner_headers, test_plot):
    store_power(db, test_plot, 10, end=date(2026, 11, 14))
    data = client.post(URL, json=body(test_plot, start_on="2026-11-10"), headers=owner_headers).json()
    assert data["context"]["power"]["end"] == "2026-11-09"


def test_declared_plot_data_removes_its_missing_items(client, db, owner_headers, test_plot):
    complete_plot(client, db, owner_headers, test_plot)
    response = client.post(URL, json=body(test_plot), headers=owner_headers)
    assert missing_fields(response) == [
        "crops.maiz.requirements", "crops.frijol_caupi.requirements", "crops.camote.requirements"]
    assert response.json()["context"]["power"]["use"] == "historico"


def test_without_engine_never_invents_alternatives(client, db, owner_headers, test_plot, monkeypatch):
    complete_plot(client, db, owner_headers, test_plot)
    complete_catalog(monkeypatch)
    response = client.post(URL, json=body(test_plot), headers=owner_headers)
    data = response.json()
    assert data["status"] == "insufficient_data" and data["alternatives"] == []
    assert data["missing"] == [{"field": "engine", "reason": "El motor de rotaciones aún no está integrado en la API."}]


def test_engine_hook_returns_ok(client, db, owner_headers, test_plot, monkeypatch):
    complete_plot(client, db, owner_headers, test_plot)
    complete_catalog(monkeypatch)
    calls = []

    def fake_engine(plot, request, context):
        calls.append((str(plot.id), request.priority, context.power.use))
        alternative = Alternative(
            id="rot-a", rank=1, score=70,
            campaigns=[Campaign(crop="frijol_caupi", starts_on="2026-12-01", ends_on="2027-03-01")],
            reasons=["razón"], limitations=["límite"], sources=[Source(title="t", url="https://example.org")])
        return "escenario_demostracion", [Assumption(field="plot.previous_crop", value="maiz", reason="supuesto")], [alternative]
    fake_engine.version = "motor-prueba"
    monkeypatch.setattr(recommendation_service, "ROTATION_ENGINE", fake_engine)

    data = client.post(URL, json=body(test_plot), headers=owner_headers).json()
    assert calls == [(test_plot["id"], "save_water", "historico")]
    assert (data["status"], data["mode"], data["engine_version"], data["selected_id"]) == (
        "ok", "escenario_demostracion", "motor-prueba", "rot-a")
    assert data["missing"] == [] and data["context"]["assumptions"][0]["field"] == "plot.previous_crop"
    assert data["alternatives"][0]["campaigns"][0]["crop"] == "frijol_caupi"


def test_auth_ownership_and_validation(client, auth_headers, owner_headers, test_plot):
    assert_error(client.post(URL, json=body(test_plot)), 401, "missing_token")
    assert_error(client.post(URL, json=body(test_plot), headers=auth_headers(uuid4())), 404, "plot_not_found")
    assert_error(client.post(URL, json=body(test_plot, plot_id=str(uuid4())), headers=owner_headers),
                 404, "plot_not_found")
    for bad in ({"priority": "diversify"}, {"horizon_days": 30}, {"horizon_days": 1000},
                {"start_on": "pronto"}, {"extra": 1}):
        assert_error(client.post(URL, json=body(test_plot, **bad), headers=owner_headers), 422, "validation_error")
    default = body(test_plot)
    default.pop("horizon_days")
    assert client.post(URL, json=default, headers=owner_headers).status_code == 200
