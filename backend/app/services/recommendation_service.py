"""POST /api/recommendations: arma el contexto real y decide qué falta.

Esta capa NO inventa recomendaciones. Comprueba los datos esenciales y, si están todos,
delega en el motor de rotaciones (ROTATION_ENGINE = app.services.rotation_engine.recommend_rotations):
    motor(plot, request, context, *, climate_days) -> (mode, assumptions, alternatives)
Si el motor no puede comparar, lanza EngineBlocked con sus faltantes y la respuesta es
`insufficient_data`. Ver backend/docs/api-contract.md.
"""

from collections.abc import Callable
from datetime import date, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database.models import CropCycle, Device, NasaObservation, Plot, SensorReading
from app.schemas.recommendation import (
    MissingItem,
    PowerContext,
    RecommendationContext,
    RecommendationRequest,
    RecommendationResponse,
    SensorContext,
)
from app.services import rotation_engine
from app.services.indicators import calcular_indicadores
from app.services.rotation_engine import EngineBlocked

API_LAYER_VERSION = "api-0.2"
ROTATION_ENGINE: Callable | None = rotation_engine.recommend_rotations

# Criterio provisional: un año de días con T2M válido para evaluar campañas futuras.
MIN_HISTORY_DAYS = 365


def _resolve_start_on(session: Session, plot: Plot, request: RecommendationRequest) -> date | None:
    """start_on de la petición o, si no viene, la sowing_date del ciclo 'planned' de la parcela."""
    if request.start_on is not None:
        return request.start_on
    return session.scalar(select(CropCycle.sowing_date).where(
        CropCycle.plot_id == plot.id, CropCycle.status == "planned"))


def _power_context(session: Session, plot: Plot,
                   start_on: date | None) -> tuple[PowerContext | None, int, list[dict]]:
    query = select(NasaObservation).where(
        NasaObservation.plot_id == plot.id,
        NasaObservation.latitude == plot.latitude,
        NasaObservation.longitude == plot.longitude,
    )
    if start_on is not None:
        query = query.where(NasaObservation.observed_on < start_on)
    rows = list(session.scalars(query.order_by(NasaObservation.observed_on)))
    if not rows:
        return None, 0, []
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
    ), valid_days, registros


def _sensor_context(session: Session, plot: Plot) -> SensorContext:
    flags = dict(session.execute(
        select(SensorReading.quality_flag, func.count())
        .join(Device, Device.id == SensorReading.device_id)
        .where(Device.plot_id == plot.id)
        .group_by(SensorReading.quality_flag)
    ).all())
    if not flags:
        return SensorContext(quality_flag=None, used_as_evidence=False, reason="Esta parcela todavía no tiene lecturas del sensor.")
    if set(flags) == {"test"}:
        return SensorContext(quality_flag="test", used_as_evidence=False,
                             reason="Las lecturas del sensor son de prueba, tomadas fuera del campo, y no se usan para el cálculo.")
    return SensorContext(quality_flag="ok", used_as_evidence=False,
                         reason="Las lecturas del sensor todavía no se usan para el cálculo.")


def _missing(session: Session, plot: Plot, power: PowerContext | None, valid_days: int,
             start_on: date | None) -> list[MissingItem]:
    missing = []
    if start_on is None:
        missing.append(MissingItem(field="plot.next_sowing_date",
                                   reason="Falta la fecha en que piensas sembrar la siguiente campaña."))
    has_previous = session.scalar(select(func.count()).select_from(CropCycle).where(
        CropCycle.plot_id == plot.id, CropCycle.status == "finished"))
    if not has_previous:
        missing.append(MissingItem(field="plot.previous_crop",
                                   reason="Falta indicar qué cultivo tuviste antes en esta parcela."))
    if plot.water_availability is None:
        missing.append(MissingItem(field="plot.water_availability",
                                   reason="Falta indicar cuánta agua tienes para regar: poca, media o mucha."))
    if plot.soil_texture is None:
        missing.append(MissingItem(field="plot.soil_texture", reason="Falta indicar qué tipo de suelo tiene la parcela, por ejemplo arenoso, franco o arcilloso."))
    # Solo si bloquean: con dos cultivos completos ya se puede rotar (los demás van en limitations).
    missing.extend(rotation_engine.crop_requirement_missing())
    if power is None:
        missing.append(MissingItem(field="climate.history",
                                   reason="Todavía no hay datos del clima de la NASA guardados para esta parcela."))
    elif valid_days < MIN_HISTORY_DAYS:
        missing.append(MissingItem(field="climate.history",
                                   reason=f"Hay {valid_days} días de datos del clima y se necesita al menos un año ({MIN_HISTORY_DAYS} días) "
                                          "para comparar campañas."))
    return missing


def _insufficient(plot: Plot, created_at: datetime, context: RecommendationContext,
                  missing: list[MissingItem]) -> RecommendationResponse:
    return RecommendationResponse(
        status="insufficient_data", mode="evaluacion", engine_version=_engine_version(),
        plot_id=plot.id, created_at=created_at, context=context, missing=missing,
        selected_id=None, alternatives=[],
    )


def _engine_version() -> str:
    return getattr(ROTATION_ENGINE, "version", API_LAYER_VERSION)


def recommend(session: Session, plot: Plot, request: RecommendationRequest) -> RecommendationResponse:
    created_at = datetime.now(timezone.utc)
    start_on = _resolve_start_on(session, plot, request)
    power, valid_days, climate_days = _power_context(session, plot, start_on)
    context = RecommendationContext(
        notice="Revisamos los datos de tu parcela. Mientras falten datos importantes, no mostramos alternativas.",
        start_on=start_on,
        power=power,
        sensor=_sensor_context(session, plot),
    )
    # El motor solo se llama con todos los datos: sus faltantes propios no se mezclan con los de la parcela.
    missing = _missing(session, plot, power, valid_days, start_on)
    if not missing and ROTATION_ENGINE is None:
        missing.append(MissingItem(field="engine", reason="El sistema de recomendaciones todavía no está listo."))
    if missing:
        return _insufficient(plot, created_at, context, missing)

    try:
        # El motor recibe la petición con start_on ya resuelto y los días de clima anteriores a start_on.
        mode, assumptions, alternatives = ROTATION_ENGINE(
            plot, request.model_copy(update={"start_on": start_on}), context, climate_days=climate_days)
    except EngineBlocked as blocked:
        return _insufficient(plot, created_at, context, blocked.missing)
    if not alternatives:
        return _insufficient(plot, created_at, context, [MissingItem(
            field="engine", reason="No encontramos rotaciones que se puedan comparar con los datos actuales.")])
    if mode == "escenario_demostracion" and not assumptions:
        raise ValueError("Un escenario de demostración debe declarar sus supuestos.")

    context.assumptions = assumptions if mode == "escenario_demostracion" else []
    context.notice = ("Escenario de demostración: parte de los datos son supuestos, no medidos."
                      if mode == "escenario_demostracion"
                      else "Estas alternativas se calcularon con los datos de tu parcela y fuentes citadas.")
    alternatives = sorted(alternatives, key=lambda a: a.rank)
    return RecommendationResponse(
        status="ok", mode=mode, engine_version=_engine_version(),
        plot_id=plot.id, created_at=created_at, context=context, missing=[],
        selected_id=alternatives[0].id, alternatives=alternatives,
    )
