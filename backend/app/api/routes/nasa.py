"""NASA POWER guardado por parcela: importar a nasa_observation y leer el historial.

Rutas que ya usa el frontend (frontend/src/services/api.ts):
- POST /api/plots/{plot_id}/nasa/power         -> refreshNasaPower
- GET  /api/plots/{plot_id}/nasa/observations  -> getNasaObservations
"""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import DbSession, OwnedPlot
from app.schemas.climate import NasaImportRequest, NasaImportResult, NasaObservationRead, NasaVariable
from app.services.nasa import persistence

router = APIRouter(prefix="/plots", tags=["NASA POWER"])


@router.post("/{plot_id}/nasa/power", response_model=NasaImportResult)
def import_nasa_power(plot: OwnedPlot, session: DbSession, body: NasaImportRequest | None = None) -> NasaImportResult:
    """Consulta POWER diario (9 variables, AG, LST) en el punto de la parcela y lo guarda.

    Sin cuerpo (o `{}`) importa los últimos 90 días; como máximo 4018 días (11 años) por petición.
    Se puede repetir: actualiza sin duplicar.
    """
    body = body or NasaImportRequest()
    return persistence.import_power(session, plot, body.start, body.end)


@router.get("/{plot_id}/nasa/observations", response_model=list[NasaObservationRead])
def list_nasa_observations(
    plot: OwnedPlot,
    session: DbSession,
    date_from: Annotated[date | None, Query(alias="from", description="Primer día LST, inclusivo")] = None,
    date_to: Annotated[date | None, Query(alias="to", description="Último día LST, inclusivo")] = None,
    variable: NasaVariable | None = None,
) -> list[NasaObservationRead]:
    """Observaciones guardadas del punto actual de la parcela, por fecha ascendente."""
    rows = persistence.list_observations(session, plot, date_from=date_from, date_to=date_to, variable=variable)
    return [NasaObservationRead.model_validate(row) for row in rows]
