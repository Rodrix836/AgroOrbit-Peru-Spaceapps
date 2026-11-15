"""Adaptador entre POST /api/recommendations y el motor de rotaciones (app.engine.recommendation).

El motor de Milene compara rotaciones de dos campañas a partir de puntuaciones por criterio
(clima, agua, suelo, diversificación) y ponderaciones por prioridad que **deben venir con fuentes**.
Este adaptador:

1. Toma del catálogo (app/data/crops.py) solo los cultivos cuyos requisitos tienen valor **y** una
   fuente que los respalde (`fuentes[].campos`).
2. Arma los candidatos: pares ordenados de cultivos distintos, con la duración mínima del catálogo,
   fechas de campaña desde `start_on` y el clima de NASA POWER de esas mismas fechas en años anteriores.
3. Pide las puntuaciones y ponderaciones a EVALUATION_PROVIDER. Mientras no exista una fuente para
   ellas, el proveedor es None y la respuesta es `insufficient_data` (nunca se inventan puntuaciones).
4. Traduce el resultado del motor al contrato (modo, supuestos `{field, value, reason}`, alternativas).

EVALUATION_PROVIDER(plot, request, candidates) -> dict | None, con:
    {"mode": "evaluacion" | "escenario_demostracion",
     "assumptions": [Assumption, ...],                       # solo en escenario_demostracion
     "priority_weights": {"save_water": {"clima": 0.1, ...}, "improve_soil": {...}},
     "evaluations": {candidate_id: {criterio: {"score", "reasons", "limitations", "sources"}}}}
`candidates[i]["water_availability"]` es el agua declarada en la parcela: la petición no la trae.
"""

from collections.abc import Callable
from datetime import date, timedelta
from itertools import permutations
from urllib.parse import urlparse

from app.data import crops as crops_catalog
from app.engine import recommendation as engine
from app.engine.scoring import CRITERIOS
from app.schemas.recommendation import Alternative, Assumption, MissingItem
from app.services.indicators import calcular_indicadores

REQUIRED_CROP_FIELDS = engine.REQUIRED_CROP_FIELDS
MODE_TO_API = {"evidence_based": "evaluacion", "scenario_demonstration": "escenario_demostracion"}
API_TO_MODE = {v: k for k, v in MODE_TO_API.items()}
CLIMATE_YEARS_BACK = 5  # años anteriores en los que se busca el clima de las fechas de cada campaña

EVALUATION_PROVIDER: Callable | None = None

# Texto sencillo de cada requisito, para `missing[].reason`.
PLAIN_REQUIREMENT = {
    "temperatura_min_c": "temperaturas", "temperatura_max_c": "temperaturas",
    "agua_min_mm_campana": "agua por campaña", "agua_max_mm_campana": "agua por campaña",
    "duration_min_days": "duración de la campaña", "duration_max_days": "duración de la campaña",
    "soil_ph_min": "pH del suelo", "soil_ph_max": "pH del suelo",
    "soil_salinity_max_ds_m": "salinidad que tolera", "soil_texture_accepted": "tipos de suelo",
}


class EngineBlocked(Exception):
    """El motor no puede comparar rotaciones: `missing` explica por qué."""

    def __init__(self, missing: list[MissingItem]):
        super().__init__(", ".join(m.field for m in missing))
        self.missing = missing


def _valid_source(source: dict) -> bool:
    url = urlparse(str(source.get("url", "")))
    return bool(str(source.get("titulo", "")).strip()) and url.scheme in {"http", "https"} and bool(url.netloc)


def _sourced(crop: dict, field: str) -> bool:
    """Valor presente y al menos una fuente válida que lo cite en `campos`."""
    return crop.get(field) is not None and any(
        field in s.get("campos", []) and _valid_source(s) for s in crop.get("fuentes", []))


def crop_requirement_gaps() -> dict[str, list[str]]:
    """Por cultivo, los requisitos del motor que faltan o no tienen fuente."""
    return {crop_id: [f for f in REQUIRED_CROP_FIELDS if not _sourced(crop, f)]
            for crop_id, crop in crops_catalog.obtener_cultivos().items()}


def crop_requirement_missing() -> list[MissingItem]:
    """Faltantes del catálogo, solo si bloquean: hacen falta al menos dos cultivos completos para rotar."""
    gaps = crop_requirement_gaps()
    if sum(not fields for fields in gaps.values()) >= 2:
        return []
    items = []
    for crop_id, fields in gaps.items():
        if fields:
            plain = list(dict.fromkeys(PLAIN_REQUIREMENT[f] for f in fields))
            listed = plain[0] if len(plain) == 1 else ", ".join(plain[:-1]) + " y " + plain[-1]
            name = crops_catalog.obtener_cultivo(crop_id)["nombre"]
            items.append(MissingItem(
                field=f"crops.{crop_id}.requirements",
                reason=f"Todavía no tenemos, de una fuente confiable, estos datos del cultivo «{name}»: {listed}."))
    return items


def _requirement_sources(crop: dict) -> list[dict[str, str]]:
    return [{"title": s["titulo"], "url": s["url"]} for s in crop.get("fuentes", [])
            if _valid_source(s) and set(s.get("campos", [])) & set(REQUIRED_CROP_FIELDS)]


def _shift_years(day: date, years: int) -> date:
    try:
        return day.replace(year=day.year + years)
    except ValueError:  # 29 de febrero
        return day.replace(year=day.year + years, day=28)


def window_indicators(climate_days: list[dict], starts_on: date, ends_on: date) -> dict:
    """Indicadores de NASA POWER de las mismas fechas de la campaña en años anteriores."""
    by_day = {date.fromisoformat(d["fecha"]): d for d in climate_days}
    selected = []
    for k in range(1, CLIMATE_YEARS_BACK + 1):
        start, end = _shift_years(starts_on, -k), _shift_years(ends_on, -k)
        selected += [by_day[d] for d in sorted(by_day) if start <= d <= end]
    return calcular_indicadores(selected) if selected else {"temperatura_promedio_c": None}


def _candidates(plot, request, climate_days: list[dict]) -> tuple[list[dict], list[str]]:
    gaps = crop_requirement_gaps()
    complete = [c for c, fields in gaps.items() if not fields]
    catalog = crops_catalog.obtener_cultivos()
    notes = [f"No se evaluó el cultivo «{catalog[c]['nombre']}» porque faltan datos confiables de sus requisitos."
             for c, fields in gaps.items() if fields]
    candidates, too_long, no_climate = [], 0, 0
    for first, second in permutations(complete, 2):
        crops = [catalog[first], catalog[second]]
        durations = [crop["duration_min_days"] for crop in crops]
        if sum(durations) > request.horizon_days:
            too_long += 1
            continue
        campaigns, start = [], request.start_on
        for crop_id, days in zip((first, second), durations):
            end = start + timedelta(days=days - 1)
            campaigns.append({"crop": crop_id, "starts_on": start, "ends_on": end})
            start = end + timedelta(days=1)
        indicators = [window_indicators(climate_days, c["starts_on"], c["ends_on"]) for c in campaigns]
        if any(i.get("temperatura_promedio_c") is None for i in indicators):
            no_climate += 1
            continue
        candidates.append({
            "id": f"{first}__{second}",
            "name": f"{crops[0]['nombre']} → {crops[1]['nombre']}",
            "crops": [first, second],
            "duration_days": durations,
            "campaigns": campaigns,
            "climate_indicators": indicators,
            "water_availability": plot.water_availability,
            "requirement_sources": _requirement_sources(crops[0]) + _requirement_sources(crops[1]),
        })
    if not candidates and too_long:
        raise EngineBlocked([MissingItem(
            field="request.horizon_days",
            reason="El plazo elegido es más corto que dos campañas seguidas. Elige un plazo más largo.")])
    if not candidates and no_climate:
        raise EngineBlocked([MissingItem(
            field="climate.history",
            reason="No hay datos del clima de años anteriores para las fechas de las campañas.")])
    if not candidates:
        raise EngineBlocked(crop_requirement_missing())
    notes.append("Las fechas usan la duración más corta citada para cada cultivo; varía según la variedad.")
    return candidates, notes


def recommend_rotations(plot, request, context, *, climate_days: list[dict]):
    """ROTATION_ENGINE del servicio: devuelve (mode, assumptions, alternatives) o lanza EngineBlocked."""
    candidates, notes = _candidates(plot, request, climate_days)

    if EVALUATION_PROVIDER is None:
        raise EngineBlocked([
            MissingItem(field="engine.criteria",
                        reason="Todavía no tenemos, de una fuente confiable, cómo puntuar cada rotación "
                               "en clima, agua, suelo y variedad de cultivos."),
            MissingItem(field=f"engine.priority_weights.{request.priority}",
                        reason="Todavía no tenemos, de una fuente confiable, cuánto pesa cada uno de esos "
                               "puntos según tu prioridad."),
        ])
    result = EVALUATION_PROVIDER(plot, request, candidates)
    weights = (result or {}).get("priority_weights", {}).get(request.priority)
    if not weights:
        raise EngineBlocked([MissingItem(
            field=f"engine.priority_weights.{request.priority}",
            reason="Todavía no tenemos, de una fuente confiable, cuánto pesa cada punto según tu prioridad.")])
    mode = API_TO_MODE.get(result.get("mode"))
    assumptions: list[Assumption] = list(result.get("assumptions", []))
    evaluations = result.get("evaluations", {})
    engine_candidates = [{
        "id": c["id"], "name": c["name"], "crops": c["crops"], "duration_days": c["duration_days"],
        # El motor parte de esta lista para las fuentes: van todas las de los requisitos usados.
        "duration_sources": c["requirement_sources"],
        "climate_indicators": c["climate_indicators"],
        "evaluations": evaluations[c["id"]],
        "limitations": notes,
    } for c in candidates if set(evaluations.get(c["id"], {})) >= set(CRITERIOS)]
    if not engine_candidates:
        raise EngineBlocked([MissingItem(
            field="engine.criteria",
            reason="Todavía no tenemos, de una fuente confiable, cómo puntuar estas rotaciones.")])

    engine_mode, engine_assumptions, alternatives = engine.motor(plot, request, {
        "mode": mode,
        "assumptions": [a.reason for a in assumptions],
        "priority_weights": {request.priority: weights},
        "candidates": engine_candidates,
    })
    if engine_mode == "insufficient_data":
        raise EngineBlocked([MissingItem(field="engine", reason=" ".join(engine_assumptions))])
    api_mode = MODE_TO_API[engine_mode]
    return (api_mode,
            assumptions if api_mode == "escenario_demostracion" else [],
            [Alternative(**a) for a in alternatives])


recommend_rotations.version = f"motor-{engine.motor.version}"
