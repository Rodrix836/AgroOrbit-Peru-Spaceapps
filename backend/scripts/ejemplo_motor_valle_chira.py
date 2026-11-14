"""Ejemplo local del motor de rotaciones para la ubicación demostrativa del Valle del Chira."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from urllib.parse import urlparse
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.data.crops import obtener_cultivo
from app.engine.rotation import crear_rotacion, validar_rotacion
from app.engine.scoring import CRITERIOS, comparar_rotaciones

PLOT_FIELDS_REQUIRED = (
    "area_ha",
    "water_source",
    "water_availability",
    "soil_texture",
    "soil_ph",
    "soil_salinity_ds_m",
    "declared_irrigated",
)
CROP_FIELDS_REQUIRED = (
    "temperatura_min_c",
    "temperatura_max_c",
    "agua_min_mm_campana",
    "agua_max_mm_campana",
)
DEMO_MODE = "escenario_demostracion"
OPERATIVE_MODE = "operativo"
DEMO_PLOT_ID = "f544f739-bc06-45c6-9cf9-052c44499ab6"


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _is_missing(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def _valid_reference(reference: Any) -> bool:
    if not isinstance(reference, dict):
        return False
    title = reference.get("titulo")
    url = reference.get("url")
    if not isinstance(title, str) or not title.strip() or not isinstance(url, str):
        return False
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _references_for_field(references: Any, field: str) -> bool:
    return isinstance(references, list) and any(
        _valid_reference(reference)
        and isinstance(reference.get("campos"), list)
        and field in reference["campos"]
        for reference in references
    )


def _validate_plot_value(field: str, value: Any) -> None:
    if field in {"area_ha", "soil_ph", "soil_salinity_ds_m"}:
        if not _is_number(value):
            raise ValueError(f"El supuesto {field} debe ser numérico y finito.")
        if field == "area_ha" and value <= 0:
            raise ValueError("area_ha debe ser mayor que cero.")
        if field == "soil_ph" and not 0 <= value <= 14:
            raise ValueError("soil_ph debe estar entre 0 y 14.")
        if field == "soil_salinity_ds_m" and value < 0:
            raise ValueError("soil_salinity_ds_m no puede ser negativo.")
    elif field in {"water_source", "soil_texture"}:
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"El supuesto {field} debe ser texto no vacío.")
    elif field == "water_availability":
        if not isinstance(value, str) or value not in {"low", "medium", "high"}:
            raise ValueError("water_availability debe ser low, medium o high.")
    elif field == "declared_irrigated" and not isinstance(value, bool):
        raise ValueError("declared_irrigated debe ser booleano.")


def _validate_fixture(fixture: dict[str, Any], plot: dict[str, Any]) -> dict[str, Any]:
    if fixture.get("fuente") != "NASA POWER":
        raise ValueError("El fixture debe identificar NASA POWER como fuente.")
    if fixture.get("plot_id") != plot.get("plot_id"):
        raise ValueError("El fixture NASA POWER no corresponde al plot_id de la entrada.")
    coordinates = fixture.get("coordenadas")
    if not isinstance(coordinates, dict):
        raise ValueError("El fixture debe incluir coordenadas.")
    for axis in ("latitude", "longitude"):
        if not _is_number(coordinates.get(axis)) or not _is_number(plot.get(axis)):
            raise ValueError(f"Coordenada inválida: {axis}.")
        if not math.isclose(coordinates[axis], plot[axis], abs_tol=0.000001):
            raise ValueError(f"Las coordenadas del fixture no coinciden en {axis}.")

    period = fixture.get("periodo")
    if not isinstance(period, dict):
        raise ValueError("El fixture debe incluir el periodo.")
    days, valid_days = period.get("dias"), period.get("dias_validos")
    temperature, precipitation = fixture.get("temperatura_media_c"), fixture.get("precipitacion_total_mm")
    if (not isinstance(days, int) or isinstance(days, bool) or days <= 0
            or not isinstance(valid_days, int) or isinstance(valid_days, bool)
            or not 0 <= valid_days <= days):
        raise ValueError("La cobertura del fixture NASA POWER es inválida.")
    if not _is_number(temperature) or not _is_number(precipitation) or precipitation < 0:
        raise ValueError("Los agregados del fixture NASA POWER son inválidos.")
    if fixture.get("datos_diarios") is not None:
        raise ValueError("Este ejemplo acepta el resumen entregado, no observaciones diarias reconstruidas.")

    return {
        "fuente": fixture["fuente"],
        "coordenadas": coordinates,
        "periodo": period,
        "temperatura_media_c": temperature,
        "precipitacion_total_mm": precipitation,
        "codigo_faltante": fixture.get("codigo_faltante"),
        "datos_diarios_disponibles": False,
        "uso": "Contexto del 1 al 14 de noviembre de 2026; no es climatología de campaña.",
    }


def _build_rotations(raw_rotations: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_rotations, list) or len(raw_rotations) != 2:
        raise ValueError("La entrada debe definir exactamente dos rotaciones candidatas.")
    rotations = []
    seen_ids = set()
    for raw_rotation in raw_rotations:
        if not isinstance(raw_rotation, dict):
            raise ValueError("Cada rotación debe ser un objeto.")
        rotation_id = raw_rotation.get("rotacion_id")
        if not isinstance(rotation_id, str) or not rotation_id.strip():
            raise ValueError("Cada rotación necesita un rotacion_id no vacío.")
        if rotation_id in seen_ids:
            raise ValueError("Los identificadores de rotación deben ser únicos.")
        seen_ids.add(rotation_id)
        if not isinstance(raw_rotation.get("nombre"), str) or not raw_rotation["nombre"].strip():
            raise ValueError(f"La rotación {rotation_id} necesita un nombre no vacío.")
        rotation = crear_rotacion(
            rotation_id,
            raw_rotation.get("nombre"),
            raw_rotation.get("cultivos"),
        )
        if not validar_rotacion(rotation):
            raise ValueError(f"La rotación {rotation_id} no es válida.")
        for crop_id in raw_rotation["cultivos"]:
            if obtener_cultivo(crop_id) is None:
                raise ValueError(f"El catálogo no contiene el cultivo '{crop_id}'.")
        rotations.append(rotation)
    return rotations


def _crop_gaps(rotations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    crop_ids = dict.fromkeys(
        crop["cultivo"]
        for rotation in rotations
        for crop in rotation["campanas"]
    )
    gaps = []
    for crop_id in crop_ids:
        crop = obtener_cultivo(crop_id)
        for field in CROP_FIELDS_REQUIRED:
            value = crop.get(field)
            if value is not None and not _is_number(value):
                raise ValueError(f"El requisito {field} de {crop_id} debe ser numérico y finito.")
            if field.startswith("agua_") and value is not None and value < 0:
                raise ValueError(f"El requisito {field} de {crop_id} no puede ser negativo.")
        if (crop.get("temperatura_min_c") is not None
                and crop.get("temperatura_max_c") is not None
                and crop["temperatura_min_c"] > crop["temperatura_max_c"]):
            raise ValueError(f"El rango de temperatura de {crop_id} es inválido.")
        if (crop.get("agua_min_mm_campana") is not None
                and crop.get("agua_max_mm_campana") is not None
                and crop["agua_min_mm_campana"] > crop["agua_max_mm_campana"]):
            raise ValueError(f"El rango de agua de {crop_id} es inválido.")
        missing = [field for field in CROP_FIELDS_REQUIRED if crop.get(field) is None]
        missing_sources = [
            field for field in CROP_FIELDS_REQUIRED
            if not _references_for_field(crop.get("fuentes"), field)
        ]
        if missing or missing_sources:
            gaps.append({
                "cultivo_id": crop_id,
                "nombre": crop["nombre"],
                "requisitos": {field: crop.get(field) for field in CROP_FIELDS_REQUIRED},
                "fuentes": crop.get("fuentes", []),
                "requisitos_sin_dato": missing,
                "requisitos_sin_fuente_por_campo": missing_sources,
            })
    return gaps


def _scoring_inputs(
    evaluation: Any,
    rotations: list[dict[str, Any]],
) -> tuple[dict[str, Any] | None, list[dict[str, Any]], list[str]]:
    if not isinstance(evaluation, dict):
        return None, [], ["evaluacion.pesos", "evaluacion.rotaciones"]

    weights = evaluation.get("pesos")
    missing = []
    if not isinstance(weights, dict) or set(weights) != set(CRITERIOS):
        missing.append("evaluacion.pesos")

    raw_scores = evaluation.get("rotaciones")
    if not isinstance(raw_scores, list) or len(raw_scores) != 2:
        return None, [], missing + ["evaluacion.rotaciones"]

    by_id = {}
    for item in raw_scores:
        if not isinstance(item, dict) or not isinstance(item.get("rotacion_id"), str):
            continue
        if item["rotacion_id"] in by_id:
            return None, [], ["evaluacion.rotaciones contiene identificadores duplicados"]
        by_id[item["rotacion_id"]] = item
    expected_ids = {rotation["rotacion_id"] for rotation in rotations}
    if set(by_id) != expected_ids:
        missing.append("evaluacion.rotaciones debe corresponder a las dos rotaciones candidatas")
        return None, [], missing

    alternatives = []
    for rotation in rotations:
        item = by_id.get(rotation["rotacion_id"])
        if item is None:
            missing.append(f"evaluacion.rotaciones.{rotation['rotacion_id']}")
            continue
        scores = item.get("puntuaciones")
        if not isinstance(scores, dict) or set(scores) != set(CRITERIOS):
            missing.append(f"puntuaciones.{rotation['rotacion_id']}")
            continue
        references_by_criterion = item.get("fuentes_por_criterio")
        for criterion in CRITERIOS:
            references = references_by_criterion.get(criterion) if isinstance(references_by_criterion, dict) else None
            if not isinstance(references, list) or not any(_valid_reference(ref) for ref in references):
                missing.append(f"fuentes.{rotation['rotacion_id']}.{criterion}")
        alternatives.append({
            **rotation,
            "puntuaciones": scores,
            "fuentes_por_criterio": references_by_criterion,
        })

    if missing:
        return None, alternatives, missing
    return {"pesos": weights, "alternativas": alternatives}, alternatives, []


def procesar_entrada(entrada: dict[str, Any], fixture: dict[str, Any]) -> dict[str, Any]:
    """Evalúa una entrada local, sin acceder a la red ni a la base de datos."""
    if not isinstance(entrada, dict):
        raise ValueError("La entrada debe ser un objeto JSON.")
    mode = entrada.get("modo")
    if mode not in {OPERATIVE_MODE, DEMO_MODE}:
        raise ValueError(f"modo debe ser '{OPERATIVE_MODE}' o '{DEMO_MODE}'.")

    plot = entrada.get("parcela")
    if not isinstance(plot, dict):
        raise ValueError("La entrada debe incluir el objeto parcela.")
    if plot.get("plot_id") != DEMO_PLOT_ID:
        raise ValueError(f"Este ejemplo requiere plot_id={DEMO_PLOT_ID}.")
    if not _is_number(plot.get("latitude")) or not _is_number(plot.get("longitude")):
        raise ValueError("La parcela debe incluir coordenadas numéricas.")

    assumptions = entrada.get("supuestos_demostracion", {})
    if not isinstance(assumptions, dict):
        raise ValueError("supuestos_demostracion debe ser un objeto.")
    if mode != DEMO_MODE and assumptions:
        raise ValueError("Los supuestos solo se permiten en modo escenario_demostracion.")
    unexpected = set(assumptions) - set(PLOT_FIELDS_REQUIRED)
    if unexpected:
        raise ValueError(f"Campos de supuesto no admitidos: {', '.join(sorted(unexpected))}.")

    effective_plot = dict(plot)
    provenance = {
        field: "dato_parcela" if not _is_missing(plot.get(field)) else "ausente"
        for field in PLOT_FIELDS_REQUIRED
    }
    if mode == DEMO_MODE:
        for field, value in assumptions.items():
            _validate_plot_value(field, value)
            effective_plot[field] = value
            provenance[field] = "supuesto_demostracion"

    missing_plot_fields = [
        field for field in PLOT_FIELDS_REQUIRED if _is_missing(effective_plot.get(field))
    ]
    rotations = _build_rotations(entrada.get("rotaciones"))
    crop_gaps = _crop_gaps(rotations)
    scoring, _, scoring_gaps = _scoring_inputs(entrada.get("evaluacion"), rotations)
    climate_context = _validate_fixture(fixture, plot)

    readings = entrada.get("lecturas_esp32", [])
    if not isinstance(readings, list) or any(not isinstance(reading, dict) for reading in readings):
        raise ValueError("lecturas_esp32 debe ser una lista de objetos.")
    test_readings = sum(reading.get("quality_flag") == "test" for reading in readings)

    blockers = [
        *({"categoria": "datos_esenciales_parcela", "campo": field} for field in missing_plot_fields),
        *({
            "categoria": "requisito_agronomico",
            "cultivo_id": gap["cultivo_id"],
            "requisitos_sin_dato": gap["requisitos_sin_dato"],
            "requisitos_sin_fuente_por_campo": gap["requisitos_sin_fuente_por_campo"],
        } for gap in crop_gaps),
        *({"categoria": "evaluacion_con_fuentes", "campo": field} for field in scoring_gaps),
    ]

    comparison = None
    if not blockers and scoring is not None:
        comparison = comparar_rotaciones(scoring["alternativas"], scoring["pesos"])
        evidence_by_id = {
            alternative["rotacion_id"]: alternative["fuentes_por_criterio"]
            for alternative in scoring["alternativas"]
        }
        for result in comparison:
            result["fuentes_por_criterio"] = evidence_by_id[result["rotacion_id"]]

    return {
        "plot_id": plot["plot_id"],
        "estado": "insufficient_data" if blockers else "evaluada",
        "modo": mode,
        "ubicacion_representativa": True,
        "coordenadas": {"latitude": plot["latitude"], "longitude": plot["longitude"]},
        "datos_reales_parcela": {field: plot.get(field) for field in PLOT_FIELDS_REQUIRED},
        "datos_para_escenario": {field: effective_plot.get(field) for field in PLOT_FIELDS_REQUIRED},
        "procedencia_campos": provenance,
        "supuestos_demostracion_aplicados": list(assumptions),
        "contexto_nasa_power": climate_context,
        "lecturas_esp32": {
            "recibidas": len(readings),
            "test_ignoradas": test_readings,
            "no_test_no_utilizadas": len(readings) - test_readings,
            "utilizadas_como_evidencia_agronomica": 0,
        },
        "rotaciones": rotations,
        "requisitos_cultivos_pendientes": crop_gaps,
        "bloqueos": blockers,
        "puntuaciones_generadas": comparison is not None,
        "comparacion": comparison,
    }


def procesar_archivo(input_path: Path) -> dict[str, Any]:
    input_path = input_path.resolve()
    entrada = json.loads(input_path.read_text(encoding="utf-8"))
    if not isinstance(entrada, dict):
        raise ValueError("El archivo de entrada debe contener un objeto JSON.")
    fixture_name = entrada.get("nasa_power_fixture")
    if not isinstance(fixture_name, str) or not fixture_name.strip():
        raise ValueError("La entrada debe indicar nasa_power_fixture.")
    fixture_path = Path(fixture_name)
    if not fixture_path.is_absolute():
        fixture_path = input_path.parent / fixture_path
    fixture = json.loads(fixture_path.resolve().read_text(encoding="utf-8"))
    if not isinstance(fixture, dict):
        raise ValueError("El fixture NASA POWER debe contener un objeto JSON.")
    return procesar_entrada(entrada, fixture)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    default_input = BACKEND_ROOT / "docs" / "examples" / "valle-chira-insufficient-input.json"
    parser.add_argument("--input", type=Path, default=default_input, help="Archivo JSON de entrada.")
    parser.add_argument("--output", type=Path, help="Destino opcional del JSON generado; por defecto stdout.")
    args = parser.parse_args()
    try:
        result = procesar_archivo(args.input)
        serialized = json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(serialized, encoding="utf-8")
        else:
            sys.stdout.write(serialized)
    except (OSError, UnicodeError, json.JSONDecodeError, ValueError) as error:
        parser.exit(2, f"{parser.prog}: error: {error}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
