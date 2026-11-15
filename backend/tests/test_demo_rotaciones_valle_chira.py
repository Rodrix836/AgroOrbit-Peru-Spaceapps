"""Archivo de demo de Rotaciones (Luis): referencia proyectada + alternativas A y B de Milene.

La respuesta usa el contrato de la API sin campos nuevos; el rol de cada estrategia va solo en el bloque
`demo` del archivo. Puntuaciones y parte de los requisitos son SINTÉTICOS; textura y fechas, supuestos.
"""

import json
from pathlib import Path

import pytest

from app.schemas.recommendation import RecommendationResponse
from scripts.escenario_demostracion import VALLE_CHIRA_PLOT_ID, valle_chira_demo

EXAMPLES = Path(__file__).resolve().parents[1] / "docs" / "examples"

# Tabla de docs/entrega-agronomica-valle-chira.md (sección 2): días inclusivos desde 2026-12-01.
EXPECTED = {
    "maiz__frijol_caupi": ("referencia", [("maiz", "2026-12-01", "2027-04-04"), ("frijol_caupi", "2027-04-05", "2027-06-03")]),
    "frijol_caupi__camote": ("alternativa", [("frijol_caupi", "2026-12-01", "2027-01-29"), ("camote", "2027-01-30", "2027-04-19")]),
    "camote__frijol_caupi": ("alternativa", [("camote", "2026-12-01", "2027-02-18"), ("frijol_caupi", "2027-02-19", "2027-04-19")]),
}
NAMES = {"maiz__frijol_caupi": "Referencia proyectada", "frijol_caupi__camote": "Alternativa A",
         "camote__frijol_caupi": "Alternativa B"}


def check_demo(data: dict, priority: str) -> None:
    demo, body = data["demo"], data["response"]
    RecommendationResponse.model_validate(body)  # mismo contrato de la API, sin campos nuevos
    assert set(body) == set(RecommendationResponse.model_fields)

    assert data["request"] == {"plot_id": VALLE_CHIRA_PLOT_ID, "priority": priority, "horizon_days": 365}
    assert data["http_status"] == 200
    assert (body["status"], body["mode"], body["missing"]) == ("ok", "escenario_demostracion", [])
    assert body["plot_id"] == VALLE_CHIRA_PLOT_ID
    assert body["context"]["start_on"] == "2026-12-01"
    assert body["context"]["sensor"]["quality_flag"] == "test"
    assert body["context"]["sensor"]["used_as_evidence"] is False

    # Exactamente las tres estrategias, con las fechas de la tabla de Milene.
    got = {a["id"]: [(c["crop"], c["starts_on"], c["ends_on"]) for c in a["campaigns"]] for a in body["alternatives"]}
    assert got == {k: v[1] for k, v in EXPECTED.items()}
    assert demo["reference_id"] == "maiz__frijol_caupi" and demo["reference_id"] in got
    assert {s["id"]: (s["rol"], s["nombre"]) for s in demo["estrategias"]} == {
        k: (EXPECTED[k][0], NAMES[k]) for k in EXPECTED}
    assert sorted(a["rank"] for a in body["alternatives"]) == [1, 2, 3]

    # «franco» y las fechas, declarados como supuestos; puntuaciones, como sintéticas.
    assumptions = {a["field"]: a["value"] for a in body["context"]["assumptions"]}
    assert assumptions["plot.soil_texture"] == "franco"
    assert assumptions["plot.next_sowing_date"] == "2026-12-01"
    assert "campaigns.dates" in assumptions and "plot.current_crop_end" in assumptions
    assert assumptions["engine.criteria"] == "sintético"
    assert "franco" in demo["supuestos"]["textura"] and "2026-12-01" in demo["supuestos"]["fechas"]
    assert "SINTÉTICAS" in demo["sintetico"]["puntuaciones"]
    for a in body["alternatives"]:
        assert set(a["criteria"]) == {"clima", "agua", "suelo", "diversificacion"}
        for criterion in a["criteria"]:
            assert any(r.startswith("SYNTHETIC") and criterion[:5] in r for r in a["reasons"])
        assert any(s["url"].startswith("https://example.invalid") for s in a["sources"])


@pytest.mark.parametrize("priority", ["improve_soil", "save_water"])
def test_generator_returns_the_three_strategies(priority):
    data = valle_chira_demo(priority, clima="sintetico")  # sin red
    check_demo(data, priority)
    assert data["demo"]["sintetico"]["clima"].startswith("SINTÉTICO")
    assert {a["field"] for a in data["response"]["context"]["assumptions"]} >= {"climate.history"}


@pytest.mark.parametrize("priority", ["improve_soil", "save_water"])
def test_published_demo_files(priority):
    """Los archivos entregados a Luis cumplen lo mismo; su clima es NASA POWER real (--clima nasa)."""
    data = json.loads((EXAMPLES / f"demo-rotaciones-valle-chira-{priority}.json").read_text(encoding="utf-8"))
    check_demo(data, priority)
    assert data["demo"]["sintetico"]["clima"].startswith("NASA POWER real")
    assert "climate.history" not in {a["field"] for a in data["response"]["context"]["assumptions"]}
    assert "token" not in json.dumps(data).lower()
