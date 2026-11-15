"""Datos exclusivamente SINTÉTICOS compartidos por las pruebas y la entrega local."""

from copy import deepcopy
from datetime import timedelta
from decimal import Decimal
from uuid import UUID

from app.data import crops as crops_module
from app.database.models import NasaObservation
from app.schemas.recommendation import Assumption
from app.services import rotation_engine

SYNTHETIC_SOURCE = {"title": "SYNTHETIC fuente de prueba (no agronómica)", "url": "https://example.invalid/fuente"}
SYNTHETIC_WEIGHTS = {
    "save_water": {"clima": 0.1, "agua": 0.7, "suelo": 0.1, "diversificacion": 0.1},
    "improve_soil": {"clima": 0.1, "agua": 0.1, "suelo": 0.7, "diversificacion": 0.1},
}
SYNTHETIC_WATER = {"maiz": 20, "frijol_caupi": 60, "camote": 90}
SYNTHETIC_SOIL = {"maiz": 20, "frijol_caupi": 90, "camote": 40}


def synthetic_catalog(monkeypatch, complete=("maiz", "frijol_caupi", "camote")):
    """Requisitos ficticios con una URL de prueba; nunca modifica el catálogo real."""
    catalog = deepcopy(crops_module.CULTIVOS)
    fields = list(rotation_engine.REQUIRED_CROP_FIELDS)
    for crop_id in complete:
        catalog[crop_id].update(
            temperatura_min_c=15, temperatura_max_c=35, agua_min_mm_campana=300, agua_max_mm_campana=900,
            duration_min_days=100, duration_max_days=200, soil_ph_min=5.5, soil_ph_max=8,
            soil_salinity_max_ds_m=4, soil_texture_accepted=["franco"],
            fuentes=[{"titulo": SYNTHETIC_SOURCE["title"], "url": SYNTHETIC_SOURCE["url"], "campos": fields}])
    monkeypatch.setattr(crops_module, "CULTIVOS", catalog)


SYNTHETIC_ASSUMPTIONS = [
    Assumption(
        field="engine.criteria",
        value="sint?tico",
        reason="SYNTHETIC: puntuaciones, pesos y requisitos de prueba."
    )
]


def synthetic_evaluator(
    calls,
    mode="escenario_demostracion",
    assumptions=tuple(SYNTHETIC_ASSUMPTIONS),
):
    """Evaluador ficticio para verificar contrato, ranking y prioridades."""
    def evaluate(plot, request, candidates):
        calls.append({"water": [c["water_availability"] for c in candidates], "ids": [c["id"] for c in candidates], "candidates": candidates})
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


def store_power(db, plot, days, end, t2m=26.5, prec=0.5):
    """Inserta una serie diaria constante ficticia; no consulta NASA."""
    for i in range(days):
        day = end - timedelta(days=i)
        for variable, value, unit in (("T2M", t2m, "C"), ("PRECTOTCORR", prec, "mm/day")):
            db.add(NasaObservation(plot_id=UUID(plot["id"]), variable=variable, observed_on=day, value=value,
                                   unit=unit, latitude=Decimal(str(plot["latitude"])),
                                   longitude=Decimal(str(plot["longitude"]))))
    db.commit()
