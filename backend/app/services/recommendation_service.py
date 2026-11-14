"""POST /api/recommendations: arma el contexto real y decide qué falta.

Esta capa NO inventa recomendaciones. Comprueba los datos esenciales y, si están todos,
delega en el motor de rotaciones (ROTATION_ENGINE). Mientras el motor no esté integrado,
la respuesta es siempre `insufficient_data` con `engine` en `missing`.

Para integrar el motor (Milene): asigna ROTATION_ENGINE a una función
    motor(plot, request, context) -> (mode, assumptions, alternatives)
que devuelva alternativas con fuentes reales. Ver backend/docs/api-contract.md.
"""

from collections.abc import Callable

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.data.crops import obtener_cultivos
from app.database.models import CropCycle, Device, NasaObservation, Plot, SensorReading
from app.schemas.recommendation import (
    MissingItem,
    PowerContext,
    RecommendationContext,
    RecommendationRequest,
    RecommendationResponse,
    SensorContext,
)
from app.services.indicators import calcular_indicadores

API_LAYER_VERSION = "api-0.1"
ROTATION_ENGINE: Callable | None = None  # se asigna al integrar el motor de Milene

# Criterio provisional: un año de días con T2M válido para evaluar campañas futuras.
MIN_HISTORY_DAYS = 365
CROP_REQUIREMENT_FIELDS = ("temperatura_min_c", "temperatura_max_c", "agua_min_mm_campana", "agua_max_mm_campana")


def _power_context(session: Session, plot: Plot, request: RecommendationRequest) -> tuple[PowerContext | None, int]:
    rows = list(session.scalars(
        select(NasaObservation).where(
            NasaObservation.plot_id == plot.id,
            NasaObservation.latitude == plot.latitude,
            NasaObservation.longitude == plot.longitude,
            NasaObservation.observed_on < request.start_on,
        ).order_by(NasaObservation.observed_on)
    ))
    if not rows:
        return None, 0
    by_day: dict = {}
    for row in rows:
        day = by_day.setdefault(row.observed_on, {"fecha": row.observed_on.isoformat(),
                                                   "temperatura_c": None, "precipitacion_mm_dia": None})
        value = float(row.value) if row.value is not None else None
        day["temperatura_c" if row.variable == "T2M" else "precipitacion_mm_dia"] = value
    registros = [by_day[d] for d in sorted(by_day)]
    valid_days = sum(r["temperatura_c"] is not None for r in registros)
    return PowerContext(
        start=registros[0]["fecha"],
        end=registros[-1]["fecha"],
        use="historico" if valid_days >= MIN_HISTORY_DAYS else "contexto_del_periodo",
        indicators=calcular_indicadores(registros),
    ), valid_days


def _sensor_context(session: Session, plot: Plot) -> SensorContext:
    flags = dict(session.execute(
        select(SensorReading.quality_flag, func.count())
        .join(Device, Device.id == SensorReading.device_id)
        .where(Device.plot_id == plot.id)
        .group_by(SensorReading.quality_flag)
    ).all())
    if not flags:
        return SensorContext(quality_flag=None, used_as_evidence=False, reason="La parcela no tiene lecturas del kit.")
    if set(flags) == {"test"}:
        return SensorContext(quality_flag="test", used_as_evidence=False,
                             reason="Lecturas de kits de prueba (quality_flag=test): no se usan como evidencia.")
    return SensorContext(quality_flag="ok", used_as_evidence=False,
                         reason="El motor de rotaciones aún no usa las lecturas del sensor.")


def _missing(session: Session, plot: Plot, power: PowerContext | None, valid_days: int) -> list[MissingItem]:
    missing = []
    has_previous = session.scalar(select(func.count()).select_from(CropCycle).where(
        CropCycle.plot_id == plot.id, CropCycle.status == "finished"))
    if not has_previous:
        missing.append(MissingItem(field="plot.previous_crop",
                                   reason="La regla de rotación necesita el cultivo anterior; la parcela aún no tiene un ciclo finished."))
    if plot.water_availability is None:
        missing.append(MissingItem(field="plot.water_availability",
                                   reason="Necesario para estimar si el agua cubre la campaña."))
    if plot.soil_texture is None:
        missing.append(MissingItem(field="plot.soil_texture", reason="Necesario para la regla de suelo."))
    for crop_id, crop in obtener_cultivos().items():
        if any(crop.get(f) is None for f in CROP_REQUIREMENT_FIELDS) or not crop.get("fuentes"):
            missing.append(MissingItem(field=f"crops.{crop_id}.requirements",
                                       reason="Rangos de temperatura y agua sin fuente verificable en el catálogo."))
    if power is None:
        missing.append(MissingItem(field="climate.history",
                                   reason="No hay datos de NASA POWER guardados: importa con POST /api/plots/{plot_id}/nasa/power."))
    elif valid_days < MIN_HISTORY_DAYS:
        missing.append(MissingItem(field="climate.history",
                                   reason=f"{valid_days} días de POWER no bastan para evaluar campañas futuras; "
                                          f"se necesitan al menos {MIN_HISTORY_DAYS}."))
    return missing


def recommend(session: Session, plot: Plot, request: RecommendationRequest) -> RecommendationResponse:
    power, valid_days = _power_context(session, plot, request)
    context = RecommendationContext(
        notice="Evaluación de datos disponibles. Sin datos esenciales no se generan alternativas.",
        power=power,
        sensor=_sensor_context(session, plot),
    )
    missing = _missing(session, plot, power, valid_days)

    if not missing and ROTATION_ENGINE is None:
        missing.append(MissingItem(field="engine", reason="El motor de rotaciones aún no está integrado en la API."))
    if missing:
        return RecommendationResponse(
            status="insufficient_data", mode="evaluacion", engine_version=API_LAYER_VERSION,
            plot_id=plot.id, context=context, missing=missing, selected_id=None, alternatives=[],
        )

    mode, assumptions, alternatives = ROTATION_ENGINE(plot, request, context)
    context.assumptions = assumptions
    return RecommendationResponse(
        status="ok", mode=mode, engine_version=getattr(ROTATION_ENGINE, "version", API_LAYER_VERSION),
        plot_id=plot.id, context=context, missing=[],
        selected_id=alternatives[0].id if alternatives else None, alternatives=alternatives,
    )
