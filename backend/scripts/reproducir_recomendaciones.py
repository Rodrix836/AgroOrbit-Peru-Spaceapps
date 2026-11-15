"""Genera respuestas del contrato con datos de prueba, sin red ni Supabase.

Ejecutar desde backend con Python 3.11: python scripts/reproducir_recomendaciones.py --case ok-demo
"""

import argparse
import json
import sys
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path
from uuid import UUID

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
sys.path.insert(0, str(BACKEND / "tests"))

from synthetic_recommendation import (  # noqa: E402 - fixtures compartidos, exclusivamente sintéticos
    SYNTHETIC_WEIGHTS,
    store_power,
    synthetic_catalog,
    synthetic_evaluator,
)

from app.database.models import (  # noqa: E402
    AppUser, Base, Crop, CropCycle, Device, Plot, SensorReading,
)
from app.schemas.recommendation import Assumption, RecommendationRequest, RecommendationResponse  # noqa: E402
from app.services import recommendation_service, rotation_engine  # noqa: E402

PLOT_ID = UUID("11111111-1111-4111-8111-111111111111")
USER_ID = UUID("22222222-2222-4222-8222-222222222222")
OUTPUTS = {
    "ok-demo": BACKEND / "docs/examples/entrega-milene-ok-demo.json",
    "insufficient-data": BACKEND / "docs/examples/entrega-milene-insufficient-data.json",
}


def _plot(session: Session, *, complete: bool) -> Plot:
    session.add(AppUser(id=USER_ID, display_name="SYNTHETIC usuario local"))
    plot = Plot(
        id=PLOT_ID, user_id=USER_ID, name="SYNTHETIC parcela representativa Valle del Chira",
        latitude=Decimal("-4.970000"), longitude=Decimal("-80.890000"),
        water_availability="low", soil_texture="franco" if complete else None,
        priority="save_water",
    )
    session.add(plot)
    if complete:
        session.add(CropCycle(plot_id=PLOT_ID, crop_code="maiz", status="finished"))
        session.add(CropCycle(plot_id=PLOT_ID, crop_code=None, status="planned", sowing_date=date(2026, 12, 1)))
    device = Device(plot_id=PLOT_ID, external_id="synthetic-kit-test", status="active")
    session.add(device)
    session.flush()
    session.add(SensorReading(
        device_id=device.id, observed_at=datetime(2026, 11, 15, tzinfo=timezone.utc),
        variable="soil_temperature", raw_value=Decimal("30.12"),
        calibrated_value=Decimal("30.12"), unit="°C", quality_flag="test",
    ))
    session.commit()
    return plot


def _demo_evaluator(plot, request, candidates):
    """Añade al texto de prueba el desglose sin ampliar el contrato de respuesta."""
    result = synthetic_evaluator([], mode="escenario_demostracion", assumptions=[
        Assumption(
            field="plot.previous_crop", value="maiz",
            reason="Cultivo anterior fijado en el fixture; no fue declarado por un agricultor.",
        ),
        Assumption(
            field="plot.next_sowing_date", value="2026-12-01",
            reason="Fecha planificada fijada en el fixture; no es una campaña real.",
        ),
        Assumption(
            field="plot.water_availability", value="low",
            reason="Disponibilidad de agua fijada en el fixture; no fue medida.",
        ),
        Assumption(
            field="plot.soil_texture", value="franco",
            reason="Textura fijada en el fixture; no procede de análisis de suelo.",
        ),
        Assumption(
            field="crops.requirements", value="SYNTHETIC fixture",
            reason="Los requisitos y sus fuentes example.invalid son datos de prueba, no evidencia agronómica.",
        ),
        Assumption(
            field="climate.history", value="SYNTHETIC 26.5 C y 0.5 mm/day",
            reason="La serie diaria constante se generó para reproducir el ejemplo; no son observaciones NASA.",
        ),
    ])(plot, request, candidates)
    weights = SYNTHETIC_WEIGHTS[request.priority]
    for evaluations in result["evaluations"].values():
        for criterion, evaluation in evaluations.items():
            evaluation["reasons"].append(
                f"SYNTHETIC desglose: {criterion}={evaluation['score']}/100; "
                f"peso de prueba={weights[criterion]}."
            )
    return result


def generate_case(case: str) -> dict:
    """Calcula la respuesta real del servicio sobre una base efímera local."""
    if case not in OUTPUTS:
        raise ValueError(f"Caso desconocido: {case}")
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    try:
        with Session(engine, expire_on_commit=False) as session:
            session.add_all([Crop(code=code, name=name) for code, name in (
                ("maiz", "Maíz"), ("frijol_caupi", "Frijol caupí"), ("camote", "Camote"),
            )])
            session.commit()
            plot = _plot(session, complete=case == "ok-demo")
            # Este helper de pruebas inserta días constantes en SQLite; no consulta NASA.
            store_power(session, {"id": str(PLOT_ID), "latitude": -4.97, "longitude": -80.89},
                        732, end=date(2026, 11, 15), t2m=26.5, prec=0.5)
            request = RecommendationRequest(plot_id=PLOT_ID, priority="save_water", horizon_days=365)
            if case == "ok-demo":
                from pytest import MonkeyPatch
                with MonkeyPatch.context() as patcher:
                    synthetic_catalog(patcher)
                    patcher.setattr(rotation_engine, "EVALUATION_PROVIDER", _demo_evaluator)
                    response = recommendation_service.recommend(session, plot, request)
            else:
                response = recommendation_service.recommend(session, plot, request)
                response.context.notice = (
                    "SYNTHETIC: parcela, sensor y clima son un fixture local; "
                    "no son observaciones de campo ni de NASA. " + response.context.notice
                )
            # La validación del modelo mantiene exactamente los campos del contrato público.
            return RecommendationResponse.model_validate(response).model_dump(mode="json")
    finally:
        engine.dispose()


def normalize_for_comparison(response: dict) -> dict:
    """El único dato variable del ejemplo es la hora de ejecución."""
    normalized = dict(response)
    normalized.pop("created_at")
    return normalized


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--case", choices=OUTPUTS, required=True)
    parser.add_argument("--output", type=Path, help="Ruta alternativa de salida")
    args = parser.parse_args()
    destination = args.output or OUTPUTS[args.case]
    destination.write_text(json.dumps(generate_case(args.case), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(destination)


if __name__ == "__main__":
    main()
