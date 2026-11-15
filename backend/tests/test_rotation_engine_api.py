"""POST /api/recommendations con el motor de rotaciones integrado.

Dos casos de extremo a extremo:
- Valle del Chira con el estado REAL de la parcela demostrativa en Supabase (15/11/2026): agua `low`,
  sin suelo ni cultivo anterior, ~2 años de NASA POWER y lecturas `test`. Con el catálogo real → insufficient_data.
- Caso CONTROLADO con datos SINTÉTICOS (catálogo y evaluador marcados SYNTHETIC_*): llega a status ok.
  Sus puntuaciones, pesos y fuentes (example.invalid) no son agronómicos ni una recomendación.
"""

from copy import deepcopy
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from test_plots import assert_error

from app.data import crops as crops_module
from app.database.models import CropCycle, NasaObservation, SensorReading
from app.schemas.recommendation import Assumption
from app.services import recommendation_service, rotation_engine

URL = "/api/recommendations"
CHIRA = {"name": "Parcela demostrativa – Valle del Chira (Sullana, Piura)", "latitude": -4.97, "longitude": -80.89}

# --- Datos SINTÉTICOS: solo para pruebas -------------------------------------------------------
SYNTHETIC_SOURCE = {"title": "SYNTHETIC fuente de prueba (no agronómica)", "url": "https://example.invalid/fuente"}
SYNTHETIC_WEIGHTS = {
    "save_water": {"clima": 0.1, "agua": 0.7, "suelo": 0.1, "diversificacion": 0.1},
    "improve_soil": {"clima": 0.1, "agua": 0.1, "suelo": 0.7, "diversificacion": 0.1},
}
# Puntuaciones sintéticas por cultivo: el camote "ahorra agua" y el frijol "mejora el suelo".
SYNTHETIC_WATER = {"maiz": 20, "frijol_caupi": 60, "camote": 90}
SYNTHETIC_SOIL = {"maiz": 20, "frijol_caupi": 90, "camote": 40}


def synthetic_catalog(monkeypatch, complete=("maiz", "frijol_caupi", "camote")):
    """SYNTHETIC: requisitos completos con una fuente de prueba que los cita, solo en `complete`."""
    catalog = deepcopy(crops_module.CULTIVOS)
    fields = list(rotation_engine.REQUIRED_CROP_FIELDS)
    for crop_id in complete:
        catalog[crop_id].update(
            temperatura_min_c=15, temperatura_max_c=35, agua_min_mm_campana=300, agua_max_mm_campana=900,
            duration_min_days=100, duration_max_days=200, soil_ph_min=5.5, soil_ph_max=8,
            soil_salinity_max_ds_m=4, soil_texture_accepted=["franco"],
            fuentes=[{"titulo": SYNTHETIC_SOURCE["title"], "url": SYNTHETIC_SOURCE["url"], "campos": fields}])
    monkeypatch.setattr(crops_module, "CULTIVOS", catalog)


def synthetic_evaluator(calls, mode="evaluacion", assumptions=()):
    """SYNTHETIC: evaluador de prueba que usa el agua declarada en la parcela."""
    def evaluate(plot, request, candidates):
        calls.append({"water": [c["water_availability"] for c in candidates], "ids": [c["id"] for c in candidates]})
        evaluations = {}
        for c in candidates:
            a, b = c["crops"]
            scores = {"clima": 50, "agua": (SYNTHETIC_WATER[a] + SYNTHETIC_WATER[b]) / 2,
                      "suelo": (SYNTHETIC_SOIL[a] + SYNTHETIC_SOIL[b]) / 2, "diversificacion": 50}
            evaluations[c["id"]] = {k: {
                "score": v,
                "reasons": [f"SYNTHETIC {k}: puntuación de prueba con agua «{c['water_availability']}»."],
                "limitations": [f"SYNTHETIC {k}: no es una evaluación agronómica."],
                "sources": [SYNTHETIC_SOURCE],
            } for k, v in scores.items()}
        return {"mode": mode, "assumptions": list(assumptions),
                "priority_weights": SYNTHETIC_WEIGHTS, "evaluations": evaluations}
    return evaluate
# ------------------------------------------------------------------------------------------------


def store_power(db, plot, days, end, t2m=26.5, prec=0.5):
    for i in range(days):
        day = end - timedelta(days=i)
        for variable, value, unit in (("T2M", t2m, "C"), ("PRECTOTCORR", prec, "mm/day")):
            db.add(NasaObservation(plot_id=UUID(plot["id"]), variable=variable, observed_on=day, value=value,
                                   unit=unit, latitude=Decimal(str(plot["latitude"])),
                                   longitude=Decimal(str(plot["longitude"]))))
    db.commit()


@pytest.fixture()
def chira(client, db, owner_headers):
    """Parcela con el estado real de Valle del Chira (valores diarios de clima sintéticos y constantes)."""
    client.post("/api/users/me", json={"display_name": "Equipo AgroOrbit (demo)"}, headers=owner_headers)
    plot = client.post("/api/plots", json={**CHIRA, "water_availability": "low"}, headers=owner_headers).json()
    store_power(db, plot, 732, end=date(2026, 11, 15))
    device = client.post(f"/api/plots/{plot['id']}/devices", json={"external_id": "kit-lote4b-01"},
                         headers=owner_headers).json()
    client.post("/api/sensors/readings", headers={"X-Device-Key": device["device_key"]}, json={
        "device_id": "kit-lote4b-01", "soil_moisture_pct": 0.0, "soil_moisture_raw": 2926, "soil_temp_c": 30.12})
    for row in db.query(SensorReading).all():
        row.quality_flag = "test"  # en producción lo pone TEST_DEVICE_EXTERNAL_IDS
    db.commit()
    return plot


def complete_chira(client, db, owner_headers, plot):
    client.patch(f"/api/plots/{plot['id']}", json={"soil_texture": "franco"}, headers=owner_headers)
    db.add(CropCycle(plot_id=UUID(plot["id"]), crop_code="maiz", status="finished"))
    db.commit()
    client.post(f"/api/plots/{plot['id']}/crop-cycles", json={"status": "planned", "sowing_date": "2026-12-01"},
                headers=owner_headers)


def post(client, headers, plot, **extra):
    return client.post(URL, json={"plot_id": plot["id"], "priority": "save_water", **extra}, headers=headers)


def fields(data):
    return [m["field"] for m in data["missing"]]


# --- Caso 1: Valle del Chira, datos insuficientes ----------------------------------------------

def test_valle_del_chira_real_state_is_insufficient(client, owner_headers, chira):
    response = post(client, owner_headers, chira)
    assert response.status_code == 200, response.text
    data = response.json()
    assert (data["status"], data["mode"], data["selected_id"], data["alternatives"]) == (
        "insufficient_data", "evaluacion", None, [])
    assert data["engine_version"] == "motor-1.0"
    # Sin start_on ni ciclo planned; agua `low` declarada → no falta; clima de 2 años → no falta.
    assert fields(data) == ["plot.next_sowing_date", "plot.previous_crop", "plot.soil_texture",
                            "crops.maiz.requirements", "crops.frijol_caupi.requirements",
                            "crops.camote.requirements"]
    assert all(set(m) == {"field", "reason"} and m["reason"] for m in data["missing"])
    assert data["context"]["start_on"] is None
    assert data["context"]["power"]["use"] == "historico"
    assert data["context"]["sensor"] == {"quality_flag": "test", "used_as_evidence": False, "reason":
                                         "Las lecturas del sensor son de prueba, tomadas fuera del campo, "
                                         "y no se usan para el cálculo."}
    assert data["created_at"].endswith("Z")


def test_valle_del_chira_with_farmer_data_is_blocked_only_by_catalog(client, db, owner_headers, chira):
    """Con los datos del agricultor completos, lo único que impide `ok` son los requisitos sin fuente."""
    complete_chira(client, db, owner_headers, chira)
    data = post(client, owner_headers, chira).json()
    assert data["context"]["start_on"] == "2026-12-01"  # sale del ciclo planned
    reasons = {m["field"]: m["reason"] for m in data["missing"]}
    assert list(reasons) == ["crops.maiz.requirements", "crops.frijol_caupi.requirements",
                             "crops.camote.requirements"]
    assert reasons["crops.maiz.requirements"].endswith("pH del suelo, salinidad que tolera y tipos de suelo.")
    assert "agua por campaña" in reasons["crops.frijol_caupi.requirements"]
    assert "agua por campaña" in reasons["crops.camote.requirements"]


def test_with_catalog_complete_and_no_evaluator_names_engine_gaps(client, db, owner_headers, chira, monkeypatch):
    complete_chira(client, db, owner_headers, chira)
    synthetic_catalog(monkeypatch)
    data = post(client, owner_headers, chira).json()
    assert data["status"] == "insufficient_data"
    assert fields(data) == ["engine.criteria", "engine.priority_weights.save_water"]


def test_engine_gaps_only_when_farmer_data_is_complete(client, owner_headers, chira, monkeypatch):
    synthetic_catalog(monkeypatch)
    data = post(client, owner_headers, chira).json()
    assert fields(data) == ["plot.next_sowing_date", "plot.previous_crop", "plot.soil_texture"]


# --- Caso 2: controlado, datos completos SINTÉTICOS → ok ----------------------------------------

def test_controlled_complete_case_returns_ok_with_alternatives(client, db, owner_headers, chira, monkeypatch):
    complete_chira(client, db, owner_headers, chira)
    synthetic_catalog(monkeypatch)
    calls = []
    monkeypatch.setattr(rotation_engine, "EVALUATION_PROVIDER", synthetic_evaluator(calls))

    before = datetime.now(timezone.utc)
    response = post(client, owner_headers, chira)
    assert response.status_code == 200, response.text
    data = response.json()

    assert (data["status"], data["mode"], data["missing"]) == ("ok", "evaluacion", [])
    assert data["context"]["assumptions"] == []
    assert data["context"]["start_on"] == "2026-12-01"
    stamp = datetime.fromisoformat(data["created_at"].replace("Z", "+00:00"))
    assert data["created_at"].endswith("Z") and before - timedelta(seconds=1) <= stamp

    # El agua sale de la parcela (low), no de la petición.
    assert calls[0]["water"] == ["low"] * 6

    alternatives = data["alternatives"]
    assert len(alternatives) == 3 and [a["rank"] for a in alternatives] == [1, 2, 3]
    assert data["selected_id"] == alternatives[0]["id"] == "frijol_caupi__camote"
    assert [a["score"] for a in alternatives] == sorted((a["score"] for a in alternatives), reverse=True)

    best = alternatives[0]
    # Desglose por criterio: mismas puntuaciones y pesos (save_water) que usó el motor; suma = score.
    # Forma acordada con el frontend (frontend/src/types/api.ts, Criteria): objeto con claves por criterio.
    assert best["criteria"] == {
        "clima": {"score": 50.0, "weight": 0.1, "contribution": 5.0},
        "agua": {"score": 75.0, "weight": 0.7, "contribution": 52.5},
        "suelo": {"score": 65.0, "weight": 0.1, "contribution": 6.5},
        "diversificacion": {"score": 50.0, "weight": 0.1, "contribution": 5.0},
    }
    for alternative in alternatives:
        criteria = alternative["criteria"]
        assert list(criteria) == ["clima", "agua", "suelo", "diversificacion"]
        assert all(0 <= c["score"] <= 100 and 0 <= c["weight"] <= 1 for c in criteria.values())
        assert sum(c["weight"] for c in criteria.values()) == pytest.approx(1)
        assert sum(c["contribution"] for c in criteria.values()) == pytest.approx(alternative["score"], abs=0.02)
    # Campañas: 100 días cada una (duración mínima del catálogo), seguidas desde start_on.
    assert best["campaigns"] == [
        {"crop": "frijol_caupi", "starts_on": "2026-12-01", "ends_on": "2027-03-10"},
        {"crop": "camote", "starts_on": "2027-03-11", "ends_on": "2027-06-18"},
    ]
    # Se conservan motivos, limitaciones y fuentes del evaluador y del motor.
    for criterion in ("clima", "agua", "suelo", "diversificacion"):
        assert f"SYNTHETIC {criterion}: puntuación de prueba con agua «low»." in best["reasons"]
        assert f"SYNTHETIC {criterion}: no es una evaluación agronómica." in best["limitations"]
    assert "Frijol caupí: la temperatura promedio está dentro del rango de referencia." in best["reasons"]
    assert any("duración más corta" in text for text in best["limitations"])
    assert best["sources"] == [SYNTHETIC_SOURCE]


def test_controlled_case_priority_changes_ranking(client, db, owner_headers, chira, monkeypatch):
    complete_chira(client, db, owner_headers, chira)
    synthetic_catalog(monkeypatch)
    monkeypatch.setattr(rotation_engine, "EVALUATION_PROVIDER", synthetic_evaluator([]))
    data = post(client, owner_headers, chira, priority="improve_soil").json()
    assert data["status"] == "ok"
    assert "frijol_caupi" in data["selected_id"]
    assert data["selected_id"] in {"frijol_caupi__camote", "camote__frijol_caupi"}
    weights = {k: c["weight"] for k, c in data["alternatives"][0]["criteria"].items()}
    assert weights == SYNTHETIC_WEIGHTS["improve_soil"]


def test_scenario_mode_keeps_structured_assumptions(client, db, owner_headers, chira, monkeypatch):
    complete_chira(client, db, owner_headers, chira)
    synthetic_catalog(monkeypatch)
    assumption = Assumption(field="plot.soil_texture", value="franco", reason="SYNTHETIC: suelo supuesto.")
    monkeypatch.setattr(rotation_engine, "EVALUATION_PROVIDER",
                        synthetic_evaluator([], mode="escenario_demostracion", assumptions=[assumption]))
    data = post(client, owner_headers, chira).json()
    assert (data["status"], data["mode"]) == ("ok", "escenario_demostracion")
    assert data["context"]["assumptions"] == [assumption.model_dump()]
    assert data["context"]["notice"].startswith("Escenario de demostración")


def test_incomplete_crop_is_a_limitation_not_missing(client, db, owner_headers, chira, monkeypatch):
    complete_chira(client, db, owner_headers, chira)
    synthetic_catalog(monkeypatch, complete=("maiz", "frijol_caupi"))  # camote queda con el catálogo real
    monkeypatch.setattr(rotation_engine, "EVALUATION_PROVIDER", synthetic_evaluator([]))
    data = post(client, owner_headers, chira).json()
    assert data["status"] == "ok" and data["missing"] == []
    assert {a["id"] for a in data["alternatives"]} == {"maiz__frijol_caupi", "frijol_caupi__maiz"}
    assert all(any("«Camote»" in text for text in a["limitations"]) for a in data["alternatives"])


def test_horizon_too_short_for_two_campaigns(client, db, owner_headers, chira, monkeypatch):
    complete_chira(client, db, owner_headers, chira)
    synthetic_catalog(monkeypatch)
    monkeypatch.setattr(rotation_engine, "EVALUATION_PROVIDER", synthetic_evaluator([]))
    data = post(client, owner_headers, chira, horizon_days=150).json()
    assert data["status"] == "insufficient_data" and data["alternatives"] == []
    assert fields(data) == ["request.horizon_days"]


def test_explicit_start_on_wins_over_planned(client, db, owner_headers, chira, monkeypatch):
    complete_chira(client, db, owner_headers, chira)
    synthetic_catalog(monkeypatch)
    monkeypatch.setattr(rotation_engine, "EVALUATION_PROVIDER", synthetic_evaluator([]))
    data = post(client, owner_headers, chira, start_on="2027-01-15").json()
    assert data["context"]["start_on"] == "2027-01-15"
    assert data["alternatives"][0]["campaigns"][0]["starts_on"] == "2027-01-15"


# --- Propiedad y validación ---------------------------------------------------------------------

def test_foreign_account_gets_404(client, db, auth_headers, owner_headers, chira, monkeypatch):
    complete_chira(client, db, owner_headers, chira)
    synthetic_catalog(monkeypatch)
    calls = []
    monkeypatch.setattr(rotation_engine, "EVALUATION_PROVIDER", synthetic_evaluator(calls))
    stranger = auth_headers(uuid4())
    client.post("/api/users/me", json={"display_name": "Otra cuenta"}, headers=stranger)
    assert_error(post(client, stranger, chira), 404, "plot_not_found")
    assert calls == []  # el motor no llega a ejecutarse
    assert post(client, owner_headers, chira).json()["status"] == "ok"


def test_water_is_not_accepted_in_the_request(client, owner_headers, chira):
    assert_error(post(client, owner_headers, chira, water_availability="high"), 422, "validation_error")
