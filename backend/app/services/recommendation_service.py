"""Evaluación de preparación de datos para el motor de rotaciones."""

from sqlalchemy.orm import Session

from app.data.crops import obtener_cultivos
from app.database.models import Plot
from app.engine.rotation import crear_rotacion, validar_rotacion
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse
from app.services.crop_cycle_service import list_crop_history

# El catálogo no tiene requisitos ni puntuaciones agronómicas sustentados.
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

REQUIRED_PLOT_FIELDS = (
    "area_ha",
    "water_source",
    "water_availability",
    "soil_texture",
    "soil_ph",
    "soil_salinity_ds_m",
    "declared_irrigated",
)


def _missing(field: str, reason: str) -> dict[str, str]:
    return {"field": field, "reason": reason}


def recommend(
    session: Session,
    plot: Plot,
    request: RecommendationRequest,
) -> RecommendationResponse:
    missing = []
    current, previous, _ = list_crop_history(session, plot)

    if current is None:
        missing.append(_missing(
            "current_crop_cycle",
            "Registra una campaña con estado active para identificar el cultivo actual.",
        ))
    if previous is None:
        missing.append(_missing(
            "previous_crop_cycle",
            "Registra una campaña completed anterior a la campaña actual.",
        ))

    for field in REQUIRED_PLOT_FIELDS:
        if getattr(plot, field) is None:
            missing.append(_missing(
                field,
                "Dato de parcela necesario para evaluar los criterios de agua y suelo.",
            ))

    # Validate that the observed previous/current sequence can be represented by
    # the existing rotation engine; do not score it as a future recommendation.
    if current is not None and previous is not None:
        history = crear_rotacion(
            "historial_parcela",
            "Historial reciente de la parcela",
            [previous.crop_id, current.crop_id],
        )
        if not validar_rotacion(history):
            missing.append(_missing("crop_history", "El historial no forma dos campañas válidas."))

    for crop_id, crop in obtener_cultivos().items():
        for field in REQUIRED_CROP_FIELDS:
            if crop.get(field) is None:
                missing.append(_missing(
                    f"crop_requirements.{crop_id}.{field}",
                    "El catálogo no contiene un requisito sustentado para este cultivo.",
                ))
        if not crop.get("fuentes"):
            missing.append(_missing(
                f"crop_requirements.{crop_id}.sources",
                "No hay fuentes técnicas verificadas asociadas a los requisitos.",
            ))

    missing.extend([
        _missing(
            "campaign_climate_reference",
            f"No hay referencia climática para start_on={request.start_on} y "
            f"horizon_days={request.horizon_days}; una observación breve no sustituye "
            "la climatología de campaña.",
        ),
        _missing(
            f"priority_weights.{request.priority}",
            f"Faltan ponderaciones verificables para la prioridad {request.priority}; "
            "el scorer existente agrega puntuaciones provistas, pero no calcula criterios agronómicos.",
        ),
    ])

    return RecommendationResponse(
        status="insufficient_data",
        engine_version="1.0",
        selected_id=None,
        alternatives=[],
        missing=missing,
    )
