"""Cultivo anterior, actual y próxima campaña de una parcela (public.crop_cycle).

Todas las rutas usan OwnedPlot: parcela ajena o inexistente -> 404 plot_not_found.
"""

from uuid import UUID

from fastapi import APIRouter, Response

from app.api.deps import DbSession, OwnedPlot
from app.schemas.crop_cycle import CropCycleCreate, CropCycleRead, CropCyclesSummary, CropCycleUpdate
from app.services import crop_cycle_service

router = APIRouter(prefix="/plots", tags=["Ciclos de cultivo"])


@router.get("/{plot_id}/crop-cycles", response_model=CropCyclesSummary)
def get_crop_cycles(plot: OwnedPlot, session: DbSession) -> CropCyclesSummary:
    """previous (último 'finished'), current ('active'), planned ('planned') y el historial."""
    return crop_cycle_service.summary(session, plot)


@router.post("/{plot_id}/crop-cycles", response_model=CropCycleRead, status_code=201)
def create_crop_cycle(plot: OwnedPlot, body: CropCycleCreate, session: DbSession):
    return crop_cycle_service.create(session, plot, body)


@router.patch("/{plot_id}/crop-cycles/{cycle_id}", response_model=CropCycleRead)
def update_crop_cycle(plot: OwnedPlot, cycle_id: UUID, body: CropCycleUpdate, session: DbSession):
    """Corrige un ciclo por su ID (p. ej. cambiar el cultivo o pasar 'active' a 'finished')."""
    return crop_cycle_service.update(session, plot, cycle_id, body)


@router.delete("/{plot_id}/crop-cycles/{cycle_id}", status_code=204)
def delete_crop_cycle(plot: OwnedPlot, cycle_id: UUID, session: DbSession) -> Response:
    crop_cycle_service.delete(session, plot, cycle_id)
    return Response(status_code=204)
