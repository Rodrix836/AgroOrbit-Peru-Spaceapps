"""Composición de recomendaciones a partir de evaluaciones con procedencia."""

from collections.abc import Mapping
from datetime import timedelta
from numbers import Real
from urllib.parse import urlparse

from app.data.crops import obtener_cultivo
from app.engine.rotation import crear_rotacion, validar_rotacion
from app.engine.scoring import CRITERIOS, comparar_rotaciones
from app.services.crop_evaluation import evaluar_temperatura

REQUIRED_CROP_FIELDS = (
    "temperatura_min_c",
    "temperatura_max_c",
    "agua_min_mm_campana",
    "agua_max_mm_campana",
    "duration_min_days",
    "duration_max_days",
    "soil_ph_min",
    "soil_ph_max",
    "soil_salinity_max_ds_m",
    "soil_texture_accepted",
)


def _blocked(*reasons: str) -> tuple[str, list[str], list[dict]]:
    return "insufficient_data", list(reasons), []


def _valid_sources(value: object) -> bool:
    return (
        isinstance(value, list)
        and bool(value)
        and all(_valid_source(source) for source in value)
    )


def _valid_source(source: object) -> bool:
    if not isinstance(source, Mapping):
        return False
    title = source.get("title")
    url = source.get("url")
    if not isinstance(title, str) or not title.strip() or not isinstance(url, str):
        return False
    parsed_url = urlparse(url)
    return parsed_url.scheme in {"http", "https"} and bool(parsed_url.netloc)


def _strings(value: object) -> list[str] | None:
    if not isinstance(value, list) or any(
        not isinstance(item, str) or not item.strip() for item in value
    ):
        return None
    return value


def _unique_sources(sources: list[dict[str, str]]) -> list[dict[str, str]]:
    unique = []
    seen = set()
    for source in sources:
        key = (source["title"], source["url"])
        if key not in seen:
            seen.add(key)
            unique.append({"title": key[0], "url": key[1]})
    return unique


def motor(plot, request, context) -> tuple[str, list[str], list[dict]]:
    """Evalúa y ordena como máximo tres rotaciones de dos campañas."""
    if not isinstance(context, Mapping):
        return _blocked("Falta el contexto de evaluaciones y ponderaciones.")

    plot_id = getattr(plot, "id", None)
    if plot_id is None and isinstance(plot, Mapping):
        plot_id = plot.get("id")
    if plot_id is not None and str(plot_id) != str(request.plot_id):
        return _blocked("La parcela del contexto no coincide con plot_id.")

    priorities = context.get("priority_weights")
    if not isinstance(priorities, Mapping):
        return _blocked("Faltan ponderaciones sustentadas para las prioridades.")
    weights = priorities.get(request.priority)
    if not isinstance(weights, Mapping):
        return _blocked(f"Faltan ponderaciones para {request.priority}.")

    candidates = context.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        return _blocked("No hay alternativas con evaluaciones completas.")

    assumptions = _strings(context.get("assumptions", []))
    if assumptions is None:
        return _blocked("El contexto contiene supuestos inválidos.")
    mode = context.get("mode")
    if mode not in ("evidence_based", "scenario_demonstration"):
        return _blocked("El contexto debe declarar el modo de evaluación.")
    if mode == "scenario_demonstration" and not assumptions:
        return _blocked("El modo demostrativo requiere declarar sus supuestos.")
    if mode == "evidence_based" and assumptions:
        return _blocked("Un contexto con supuestos no puede declararse validado.")

    catalog = obtener_cultivo
    rotations = []
    details = {}
    seen_ids = set()

    for candidate in candidates:
        if not isinstance(candidate, Mapping):
            return _blocked("Una alternativa tiene una estructura inválida.")

        rotation_id = candidate.get("id")
        name = candidate.get("name")
        crop_ids = candidate.get("crops")
        durations = candidate.get("duration_days")
        if (
            not isinstance(rotation_id, str)
            or not rotation_id.strip()
            or rotation_id in seen_ids
            or not isinstance(name, str)
            or not name.strip()
            or not isinstance(crop_ids, list)
            or len(crop_ids) != 2
            or any(not isinstance(crop_id, str) or not crop_id.strip() for crop_id in crop_ids)
            or not isinstance(durations, list)
            or len(durations) != 2
        ):
            return _blocked("Cada alternativa debe identificar exactamente dos campañas.")
        seen_ids.add(rotation_id)

        rotation = crear_rotacion(rotation_id, name, crop_ids)
        if not validar_rotacion(rotation):
            return _blocked(f"La rotación {rotation_id} no es válida.")

        profiles = []
        for crop_id, duration in zip(crop_ids, durations):
            profile = catalog(crop_id)
            if not isinstance(crop_id, str) or profile is None:
                return _blocked(f"No hay ficha agronómica para {crop_id}.")
            missing = [
                field for field in REQUIRED_CROP_FIELDS
                if profile.get(field) is None
            ]
            if missing:
                fields = ", ".join(missing)
                return _blocked(
                    f"crop_requirements.{crop_id}: faltan requisitos sustentados: {fields}."
                )
            if (
                isinstance(duration, bool)
                or not isinstance(duration, int)
                or duration < profile["duration_min_days"]
                or duration > profile["duration_max_days"]
            ):
                return _blocked(
                    f"La duración de {crop_id} no está dentro del rango catalogado."
                )
            profiles.append(profile)

        if sum(durations) > request.horizon_days:
            continue

        duration_sources = candidate.get("duration_sources")
        if not _valid_sources(duration_sources):
            return _blocked(f"Faltan fuentes verificables de duración en {rotation_id}.")

        evaluations = candidate.get("evaluations")
        indicators = candidate.get("climate_indicators")
        if (
            not isinstance(evaluations, Mapping)
            or not isinstance(indicators, list)
            or len(indicators) != 2
            or any(not isinstance(indicator, Mapping) for indicator in indicators)
        ):
            return _blocked(f"Faltan evaluaciones climáticas de las campañas en {rotation_id}.")

        scores = {}
        reasons = []
        limitations = []
        sources = list(duration_sources)
        for criterion in CRITERIOS:
            evaluation = evaluations.get(criterion)
            if not isinstance(evaluation, Mapping):
                return _blocked(f"Falta la evaluación {criterion} en {rotation_id}.")
            score = evaluation.get("score")
            if (
                isinstance(score, bool)
                or not isinstance(score, Real)
                or not 0 <= score <= 100
            ):
                return _blocked(f"La puntuación {criterion} de {rotation_id} no es válida.")
            if not _valid_sources(evaluation.get("sources")):
                return _blocked(f"Faltan fuentes para la evaluación {criterion} de {rotation_id}.")
            evaluation_reasons = _strings(evaluation.get("reasons"))
            evaluation_limitations = _strings(evaluation.get("limitations", []))
            if evaluation_reasons is None or evaluation_limitations is None:
                return _blocked(f"Faltan motivos o limitaciones de {criterion} en {rotation_id}.")

            if criterion == "clima":
                for indicator, profile in zip(indicators, profiles):
                    result = evaluar_temperatura(indicator, profile)
                    if result["estado"] != "evaluado":
                        return _blocked(result["motivo"])
                    reasons.append(result["motivo"])

            scores[criterion] = score
            reasons.extend(evaluation_reasons)
            limitations.extend(evaluation_limitations)
            sources.extend(evaluation["sources"])

        candidate_limitations = _strings(candidate.get("limitations", []))
        if candidate_limitations is None:
            return _blocked(f"Las limitaciones de {rotation_id} no son válidas.")
        limitations.extend(candidate_limitations)
        rotations.append({
            "rotacion_id": rotation_id,
            "nombre": name,
            "puntuaciones": scores,
        })
        details[rotation_id] = {
            "crops": crop_ids,
            "durations": durations,
            "reasons": list(dict.fromkeys(reasons)),
            "limitations": list(dict.fromkeys(limitations)),
            "sources": _unique_sources(sources),
        }

    try:
        ranked = comparar_rotaciones(rotations, weights)[:3]
    except ValueError as error:
        return _blocked(f"No se pueden comparar las alternativas: {error}")

    alternatives = []
    for rank, result in enumerate(ranked, start=1):
        rotation_id = result["rotacion_id"]
        detail = details[rotation_id]

        start = request.start_on
        campaigns = []
        for crop_id, duration in zip(detail["crops"], detail["durations"]):
            end = start + timedelta(days=duration - 1)
            campaigns.append({
                "crop": crop_id,
                "starts_on": start,
                "ends_on": end,
            })
            start = end + timedelta(days=1)

        alternatives.append({
            "id": rotation_id,
            "rank": rank,
            "score": result["puntuacion_total"],
            "campaigns": campaigns,
            "reasons": detail["reasons"],
            "limitations": detail["limitations"],
            "sources": detail["sources"],
        })

    if not alternatives:
        return _blocked("Ninguna rotación cabe en el horizonte solicitado.")
    return mode, assumptions, alternatives


motor.version = "1.0"
