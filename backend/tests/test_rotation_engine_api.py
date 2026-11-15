"""POST /api/recommendations con el motor de rotaciones integrado.

Dos casos de extremo a extremo:
- Valle del Chira con el estado REAL de la parcela demostrativa en Supabase (15/11/2026): agua `low`,
  sin suelo ni cultivo anterior, ~2 años de NASA POWER y lecturas `test`. Con el catálogo real → insufficient_data.
- Caso CONTROLADO con datos SINTÉTICOS (catálogo y evaluador marcados SYNTHETIC_*): llega a status ok
  como `escenario_demostracion`, con los supuestos declarados. Sus puntuaciones, pesos y fuentes
  (example.invalid) no son agronómicos ni una recomendación.
"""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from test_plots import assert_error

from app.database.models import CropCycle, NasaObservation, SensorReading
from app.schemas.recommendation import Assumption
from app.services import recommendation_service, rotation_engine

from synthetic_recommendation import (
    SYNTHETIC_ASSUMPTIONS,
    SYNTHETIC_SOURCE,
    SYNTHETIC_WEIGHTS,
    store_power,
    synthetic_catalog,
    synthetic_evaluator,
)


URL = "/api/recommendations"
CHIRA = {"name": "Parcela demostrativa – Valle del Chira (Sullana, Piura)", "latitude": -4.97, "longitude": -80.89}

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

    assert (data["status"], data["mode"], data["missing"]) == ("ok", "escenario_demostracion", [])
    assert data["context"]["assumptions"] == [a.model_dump() for a in SYNTHETIC_ASSUMPTIONS]
    assert data["context"]["notice"].startswith("Escenario de demostración")
    assert data["context"]["start_on"] == "2026-12-01"
    stamp = datetime.fromisoformat(data["created_at"].replace("Z", "+00:00"))
    assert data["created_at"].endswith("Z") and before - timedelta(seconds=1) <= stamp

    # El agua sale de la parcela (low), no de la petición; textura e historial, de la parcela y crop_cycle.
    assert calls[0]["water"] == ["low"] * 6
    assert {(c["soil_texture"], c["previous_crop"], c["current_crop"]) for c in calls[0]["candidates"]} == {
        ("franco", "maiz", None)}

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


def test_evaluacion_mode_mechanics_drop_assumptions(client, db, owner_headers, chira, monkeypatch):
    """Solo mecánica del modo `evaluacion` (el que usarán las reglas reales con fuentes): sin supuestos."""
    complete_chira(client, db, owner_headers, chira)
    synthetic_catalog(monkeypatch)
    monkeypatch.setattr(rotation_engine, "EVALUATION_PROVIDER", synthetic_evaluator([], mode="evaluacion", assumptions=()))
    data = post(client, owner_headers, chira).json()
    assert (data["status"], data["mode"], data["context"]["assumptions"]) == ("ok", "evaluacion", [])


def test_history_reaches_the_rules(client, db, owner_headers, chira, monkeypatch):
    """Cultivo anterior (último finished) y actual (active) llegan a las reglas en cada candidato."""
    complete_chira(client, db, owner_headers, chira)
    client.post(f"/api/plots/{chira['id']}/crop-cycles", json={"status": "active", "crop_code": "frijol_caupi"},
                headers=owner_headers)
    synthetic_catalog(monkeypatch)
    calls = []
    monkeypatch.setattr(rotation_engine, "EVALUATION_PROVIDER", synthetic_evaluator(calls))
    post(client, owner_headers, chira)
    assert {(c["previous_crop"], c["current_crop"]) for c in calls[0]["candidates"]} == {("maiz", "frijol_caupi")}


def test_climate_is_evaluated_on_campaign_dates(client, db, owner_headers, chira, monkeypatch):
    """Con un clima que cambia por mes, cada campaña recibe la temperatura de SUS fechas en años anteriores."""
    complete_chira(client, db, owner_headers, chira)
    # Rehace el clima: diciembre-marzo a 30 °C y 8 mm/día; el resto del año a 20 °C y 0 mm.
    db.query(NasaObservation).delete()
    db.commit()
    day = date(2019, 1, 1)
    while day <= date(2026, 11, 15):
        hot = day.month in (12, 1, 2, 3)
        for variable, value, unit in (("T2M", 30.0 if hot else 20.0, "C"), ("PRECTOTCORR", 8.0 if hot else 0.0, "mm/day")):
            db.add(NasaObservation(plot_id=UUID(chira["id"]), variable=variable, observed_on=day, value=value, unit=unit,
                                   latitude=Decimal("-4.970000"), longitude=Decimal("-80.890000")))
        day += timedelta(days=1)
    db.commit()
    synthetic_catalog(monkeypatch)
    calls = []
    monkeypatch.setattr(rotation_engine, "EVALUATION_PROVIDER", synthetic_evaluator(calls))
    post(client, owner_headers, chira, start_on="2026-12-01")
    c = next(c for c in calls[0]["candidates"] if c["id"] == "maiz__frijol_caupi")
    first, second = c["climate_indicators"]
    # Campaña 1: 2026-12-01 + 100 días -> 2027-03-10, toda en meses cálidos. Campaña 2: 2027-03-11..06-18.
    assert c["campaigns"][0]["ends_on"] == date(2027, 3, 10)
    assert first["temperatura_promedio_c"] == 30.0
    # 21 días de marzo a 30 °C + 79 días a 20 °C -> 22.1 °C: la ventana corta en el día exacto.
    assert second["temperatura_promedio_c"] == 22.1
    # Lluvia de una campaña: media por año, no la suma de 5 años. 100 días x 8 mm = 800 mm; la ventana
    # 2023-12-01..2024-03-10 tiene 101 días (29 de febrero) -> 808 mm, y cuenta como año completo.
    assert first["precipitacion_campana_mm"] == {"promedio": 801.6, "min_anual": 800.0, "max_anual": 808.0,
                                                 "anios_completos": 5}
    assert first["precipitacion_total_mm"] == 4008.0
    assert first["anios_analizados"] == 5
