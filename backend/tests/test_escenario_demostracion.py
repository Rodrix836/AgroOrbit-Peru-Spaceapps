"""Escenario de demostración reproducible (scripts/escenario_demostracion.py): datos SINTÉTICOS."""

import pytest

from app.data import crops as crops_module
from app.services import rotation_engine
from scripts.escenario_demostracion import SYNTHETIC_SOURCE, SYNTHETIC_WEIGHTS, run


@pytest.mark.parametrize("priority", ["save_water", "improve_soil"])
def test_demo_is_ok_and_declared_as_scenario(priority):
    catalog, provider = crops_module.CULTIVOS, rotation_engine.EVALUATION_PROVIDER
    result = run(priority)
    # No deja el catálogo sintético ni el evaluador puestos al terminar.
    assert (crops_module.CULTIVOS, rotation_engine.EVALUATION_PROVIDER) == (catalog, provider)

    assert result["http_status"] == 200
    assert "token" not in str(result).lower()
    body = result["response"]
    assert (body["status"], body["mode"], body["missing"]) == ("ok", "escenario_demostracion", [])
    assert body["context"]["notice"].startswith("Escenario de demostración")
    assert {a["field"] for a in body["context"]["assumptions"]} == {
        "plot.soil_texture", "plot.next_sowing_date", "campaigns.dates", "plot.current_crop_end",
        "crops.requirements", "engine.criteria", "climate.history"}
    assert body["context"]["start_on"] == "2026-12-01"  # del ciclo planned

    alternatives = body["alternatives"]
    assert len(alternatives) == 3 and body["selected_id"] == alternatives[0]["id"]
    for a in alternatives:
        assert len(a["campaigns"]) == 2 and a["campaigns"][0]["starts_on"] == "2026-12-01"
        assert a["reasons"] and a["limitations"] and SYNTHETIC_SOURCE in a["sources"]
        assert {k: v["weight"] for k, v in a["criteria"].items()} == SYNTHETIC_WEIGHTS[priority]
        assert sum(v["contribution"] for v in a["criteria"].values()) == pytest.approx(a["score"], abs=0.02)
        assert any(r.startswith("SYNTHETIC clima") and "2026-12-01" in r for r in a["reasons"])
