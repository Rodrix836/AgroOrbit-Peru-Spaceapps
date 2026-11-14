"""Creación, actualización y consulta del historial de cultivos de una parcela."""

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import DbSession, OwnedPlot
from app.database.models import CropCycle
from app.schemas.crop_cycle import (
    CropCycleCreate,
    CropCycleHistoryRead,
    CropCycleRead,
    CropCycleUpdate,
)
from app.services import crop_cycle_service

router = APIRouter(prefix="/plots", tags=["Campañas"])


@router.get("/{plot_id}/crop-cycles", response_model=CropCycleHistoryRead)
def get_crop_history(plot: OwnedPlot, session: DbSession) -> CropCycleHistoryRead:
    current, previous, campaigns = crop_cycle_service.list_crop_history(session, plot)
    return CropCycleHistoryRead(
        plot_id=plot.id,
        current=current,
        previous=previous,
        campaigns=campaigns,
    )


@router.post(
    "/{plot_id}/crop-cycles",
    response_model=CropCycleRead,
    status_code=201,
)
def create_crop_history(
    plot: OwnedPlot,
    body: CropCycleCreate,
    session: DbSession,
) -> CropCycle:
    return crop_cycle_service.create_crop_cycle(session, plot, body)


@router.patch(
    "/{plot_id}/crop-cycles/{cycle_id}",
    response_model=CropCycleRead,
)
def update_crop_history(
    plot: OwnedPlot,
    cycle_id: UUID,
    body: CropCycleUpdate,
    session: DbSession,
) -> CropCycle:
    return crop_cycle_service.update_crop_cycle(session, plot, cycle_id, body)
