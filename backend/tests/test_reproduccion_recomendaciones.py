"""Los ejemplos de entrega deben salir del servicio y conservar el contrato público."""

import json
import re
from datetime import date, datetime

import pytest

from app.engine.scoring import CRITERIOS
from app.schemas.recommendation import RecommendationResponse
from scripts.reproducir_recomendaciones import OUTPUTS, generate_case, normalize_for_comparison
from synthetic_recommendation import SYNTHETIC_WEIGHTS


@pytest.mark.parametrize("case", ["ok-demo", "insufficient-data"])
def test_reproducible_examples_match_service(case):
    saved = json.loads(OUTPUTS[case].read_text(encoding="utf-8"))
    fresh = generate_case(case)
    assert normalize_for_comparison(saved) == normalize_for_comparison(fresh)
    assert saved["created_at"].endswith("Z")
    datetime.fromisoformat(saved["created_at"].replace("Z", "+00:00"))
    assert set(saved) == set(RecommendationResponse.model_fields)
    RecommendationResponse.model_validate(saved)
    assert saved["engine_version"] == "motor-1.0"


def test_demo_ranking_and_breakdown_are_explicitly_synthetic():
    data = generate_case("ok-demo")
    assert data["status"] == "ok" and data["mode"] == "escenario_demostracion"
    assert data["missing"] == [] and data["selected_id"] == data["alternatives"][0]["id"]
    assert data["context"]["assumptions"]
    assert data["context"]["sensor"]["used_as_evidence"] is False
    assert [a["rank"] for a in data["alternatives"]] == list(range(1, len(data["alternatives"]) + 1))
    assert [a["score"] for a in data["alternatives"]] == sorted(
        (a["score"] for a in data["alternatives"]), reverse=True)

    for alternative in data["alternatives"]:
        first, second = alternative["campaigns"]
        assert date.fromisoformat(second["starts_on"]).toordinal() == date.fromisoformat(first["ends_on"]).toordinal() + 1
        assert alternative["sources"] and all("example.invalid" in s["url"] for s in alternative["sources"])
        breakdown = {}
        for reason in alternative["reasons"]:
            match = re.fullmatch(r"SYNTHETIC desglose: (\w+)=([\d.]+)/100; peso de prueba=([\d.]+)\.", reason)
            if match:
                breakdown[match[1]] = (float(match[2]), float(match[3]))
        assert set(breakdown) == set(CRITERIOS)
        assert {key: weight for key, (_, weight) in breakdown.items()} == SYNTHETIC_WEIGHTS["save_water"]
        assert alternative["score"] == round(sum(score * weight for score, weight in breakdown.values()), 2)


def test_insufficient_example_never_exposes_a_score():
    data = generate_case("insufficient-data")
    assert data["status"] == "insufficient_data" and data["mode"] == "evaluacion"
    assert data["context"]["notice"].startswith("SYNTHETIC:")
    assert data["selected_id"] is None and data["alternatives"] == []
    assert {item["field"] for item in data["missing"]} >= {
        "plot.next_sowing_date", "plot.previous_crop", "plot.soil_texture",
        "crops.maiz.requirements", "crops.frijol_caupi.requirements", "crops.camote.requirements",
    }
    assert all(item["reason"] for item in data["missing"])
