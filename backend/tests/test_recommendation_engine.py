"""Pruebas unitarias del motor (app.engine.recommendation) con un catálogo y evaluaciones SINTÉTICAS."""

from datetime import date
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.engine import recommendation
from app.schemas.recommendation import (
    Alternative,
    RecommendationRequest,
)


CRITERIA = ("clima", "agua", "suelo", "diversificacion")
SOURCE = {"title": "Controlled test fixture", "url": "https://example.invalid/source"}
WEIGHTS = {
    "save_water": {
        "clima": 0.1, "agua": 0.7, "suelo": 0.1, "diversificacion": 0.1,
    },
    "improve_soil": {
        "clima": 0.1, "agua": 0.1, "suelo": 0.7, "diversificacion": 0.1,
    },
}


def _profile():
    return {
        "temperatura_min_c": 20,
        "temperatura_max_c": 30,
        "agua_min_mm_campana": 1,
        "agua_max_mm_campana": 1000,
        "duration_min_days": 1,
        "duration_max_days": 180,
        "soil_ph_min": 1,
        "soil_ph_max": 14,
        "soil_salinity_max_ds_m": 100,
        "soil_texture_accepted": ["controlled"],
        "fuentes": [{"titulo": SOURCE["title"], "url": SOURCE["url"]}],
    }


def _evaluation(score):
    return {
        "score": score,
        "reasons": ["Resultado controlado para prueba."],
        "limitations": ["Fixture sintético; no es recomendación agronómica."],
        "sources": [SOURCE],
    }


def _candidate(identifier, water_score, soil_score):
    scores = {
        "clima": 50,
        "agua": water_score,
        "suelo": soil_score,
        "diversificacion": 50,
    }
    return {
        "id": identifier,
        "name": identifier,
        "crops": ["maiz", "frijol_caupi"],
        "duration_days": [10, 20],
        "duration_sources": [SOURCE],
        "climate_indicators": [
            {"temperatura_promedio_c": 25},
            {"temperatura_promedio_c": 25},
        ],
        "evaluations": {
            criterion: _evaluation(scores[criterion]) for criterion in CRITERIA
        },
        "limitations": [],
    }


def _context():
    return {
        "mode": "scenario_demonstration",
        "assumptions": ["Las puntuaciones del fixture son sintéticas y no agronómicas."],
        "priority_weights": WEIGHTS,
        "candidates": [
            _candidate("agua", 100, 0),
            _candidate("suelo", 0, 100),
            _candidate("balanceada", 60, 60),
            _candidate("baja", 20, 20),
        ],
    }


def _request(priority, plot_id=None):
    return RecommendationRequest(
        plot_id=plot_id or uuid4(),
        priority=priority,
        start_on=date(2026, 11, 14),
        horizon_days=365,
    )


@pytest.fixture
def controlled_catalog(monkeypatch):
    monkeypatch.setattr(recommendation, "obtener_cultivo", lambda crop_id: _profile())


def test_motor_prioriza_agua_o_suelo_y_respeta_response_contract(controlled_catalog):
    request = _request("save_water")
    plot = SimpleNamespace(id=request.plot_id)
    mode, assumptions, alternatives = recommendation.motor(plot, request, _context())

    assert mode == "scenario_demonstration"
    assert assumptions == ["Las puntuaciones del fixture son sintéticas y no agronómicas."]
    assert recommendation.motor.version == "1.0"
    assert len(alternatives) == 3
    assert alternatives[0]["id"] == "agua"
    assert alternatives[0]["rank"] == 1
    assert alternatives[0]["campaigns"] == [
        {
            "crop": "maiz",
            "starts_on": date(2026, 11, 14),
            "ends_on": date(2026, 11, 23),
        },
        {
            "crop": "frijol_caupi",
            "starts_on": date(2026, 11, 24),
            "ends_on": date(2026, 12, 13),
        },
    ]
    assert all(len(item["campaigns"]) == 2 for item in alternatives)
    assert all(0 <= item["score"] <= 100 for item in alternatives)

    validated = Alternative(**alternatives[0])
    assert len(validated.campaigns) == 2

    soil_mode, soil_assumptions, soil_alternatives = recommendation.motor(
        plot, _request("improve_soil", plot_id=request.plot_id), _context(),
    )
    assert soil_mode == "scenario_demonstration"
    assert soil_assumptions
    assert soil_alternatives[0]["id"] == "suelo"


def test_motor_blocks_missing_agronomic_evidence(controlled_catalog, monkeypatch):
    incomplete_profile = _profile()
    incomplete_profile["agua_min_mm_campana"] = None
    monkeypatch.setattr(
        recommendation,
        "obtener_cultivo",
        lambda crop_id: incomplete_profile,
    )

    mode, assumptions, alternatives = recommendation.motor(
        SimpleNamespace(id=None), _request("save_water"), _context(),
    )

    assert mode == "insufficient_data"
    assert "agua_min_mm_campana" in assumptions[0]
    assert alternatives == []


def test_motor_blocks_unsourced_evaluations(controlled_catalog):
    context = _context()
    context["candidates"][0]["evaluations"]["agua"]["sources"] = []

    mode, assumptions, alternatives = recommendation.motor(
        SimpleNamespace(id=None), _request("save_water"), context,
    )

    assert mode == "insufficient_data"
    assert "Faltan fuentes" in assumptions[0]
    assert alternatives == []
