"""Persistencia y selección del cultivo actual/anterior de una parcela."""

from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestError, ConflictError, NotFoundError
from app.database.models import CropCycle, Plot
from app.database.models.crop_cycle import ACTIVE_INDEX_NAME
from app.schemas.crop_cycle import CropCycleCreate, CropCycleUpdate


def _commit(session: Session, *, active: bool) -> None:
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        original = str(error.orig).lower()
        if active and (ACTIVE_INDEX_NAME in original or "crop_cycle.plot_id" in original):
            raise ConflictError(
                "La parcela ya tiene una campaña activa.", code="active_crop_cycle_exists",
            ) from error
        raise


def _assert_active_available(
    session: Session,
    plot_id: UUID,
    start_on: date,
    end_on: date,
    *,
    exclude_id: UUID | None = None,
) -> None:
    query = select(CropCycle).where(
        CropCycle.plot_id == plot_id,
        CropCycle.status == "active",
    )
    if exclude_id is not None:
        query = query.where(CropCycle.id != exclude_id)
    existing = session.scalar(query)
    if existing is None:
        return
    if start_on <= existing.end_on and end_on >= existing.start_on:
        raise ConflictError(
            "Las fechas se solapan con otra campaña activa.",
            code="active_crop_cycle_overlap",
        )
    raise ConflictError(
        "La parcela ya tiene una campaña activa.",
        code="active_crop_cycle_exists",
    )


def create_crop_cycle(session: Session, plot: Plot, data: CropCycleCreate) -> CropCycle:
    cycle = CropCycle(plot_id=plot.id, **data.model_dump())
    if cycle.status == "active":
        _assert_active_available(session, plot.id, cycle.start_on, cycle.end_on)
    session.add(cycle)
    _commit(session, active=cycle.status == "active")
    session.refresh(cycle)
    return cycle


def update_crop_cycle(
    session: Session,
    plot: Plot,
    cycle_id: UUID,
    data: CropCycleUpdate,
) -> CropCycle:
    cycle = session.scalar(select(CropCycle).where(
        CropCycle.id == cycle_id,
        CropCycle.plot_id == plot.id,
    ))
    if cycle is None:
        raise NotFoundError("Campaña no encontrada.", code="crop_cycle_not_found")

    changes = data.model_dump(exclude_unset=True)
    start_on = changes.get("start_on", cycle.start_on)
    end_on = changes.get("end_on", cycle.end_on)
    status = changes.get("status", cycle.status)
    if start_on > end_on:
        raise BadRequestError(
            "start_on debe ser anterior o igual a end_on.",
            code="invalid_crop_cycle_dates",
        )
    if status == "active":
        _assert_active_available(
            session, plot.id, start_on, end_on, exclude_id=cycle.id,
        )

    for field, value in changes.items():
        setattr(cycle, field, value)
    _commit(session, active=status == "active")
    session.refresh(cycle)
    return cycle


def list_crop_history(session: Session, plot: Plot) -> tuple[CropCycle | None, CropCycle | None, list[CropCycle]]:
    campaigns = list(session.scalars(
        select(CropCycle)
        .where(CropCycle.plot_id == plot.id)
        .order_by(CropCycle.start_on.desc(), CropCycle.end_on.desc(), CropCycle.created_at.desc())
    ))
    current = next((cycle for cycle in campaigns if cycle.status == "active"), None)
    completed = [cycle for cycle in campaigns if cycle.status == "completed"]
    if current is not None:
        completed = [cycle for cycle in completed if cycle.end_on < current.start_on]
    completed.sort(key=lambda cycle: (cycle.end_on, cycle.start_on, cycle.created_at), reverse=True)
    previous = completed[0] if completed else None
    return current, previous, campaigns
