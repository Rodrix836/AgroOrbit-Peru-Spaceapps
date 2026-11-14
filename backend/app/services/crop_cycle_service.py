"""Ciclos de cultivo por parcela: lectura del resumen, alta, corrección por ID y borrado.

Reglas de supabase/migrations/20261114222638_create_crop_cycles.sql, comprobadas antes
de escribir para responder 409/422 claros en lugar de un 500 por IntegrityError.
"""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ApiError, ConflictError, NotFoundError
from app.database.models import Crop, CropCycle, Plot
from app.schemas.crop_cycle import CropCycleCreate, CropCyclesSummary, CropCycleRead, CropCycleUpdate

SINGLE_STATUSES = ("active", "planned")


def _validation(field: str, message: str) -> ApiError:
    return ApiError(422, "validation_error", "La solicitud no es válida.",
                    details=[{"field": f"body.{field}", "message": message, "type": "value_error"}])


def _check_rules(session: Session, cycle: CropCycle) -> None:
    if cycle.status == "planned" and cycle.sowing_date is None:
        raise _validation("sowing_date", "Un ciclo 'planned' necesita sowing_date.")
    if cycle.status in ("active", "finished") and cycle.crop_code is None:
        raise _validation("crop_code", f"Un ciclo '{cycle.status}' necesita crop_code.")
    if cycle.sowing_date and cycle.harvest_date and cycle.harvest_date < cycle.sowing_date:
        raise _validation("harvest_date", "harvest_date debe ser igual o posterior a sowing_date.")
    if cycle.crop_code is not None and session.get(Crop, cycle.crop_code) is None:
        raise _validation("crop_code", "Cultivo desconocido: usa un id de GET /api/crops.")
    if cycle.status in SINGLE_STATUSES:
        other = session.scalar(select(CropCycle.id).where(
            CropCycle.plot_id == cycle.plot_id, CropCycle.status == cycle.status, CropCycle.id != cycle.id,
        ))
        if other is not None:
            raise ConflictError(
                f"La parcela ya tiene un ciclo '{cycle.status}'. Corrígelo por su ID o cámbialo de estado.",
                code=f"{cycle.status}_cycle_exists", details={"cycle_id": str(other)},
            )


def _commit(session: Session, cycle: CropCycle) -> CropCycle:
    try:
        session.commit()
    except IntegrityError as exc:
        # Carrera con otra petición: el índice único de la base tiene la última palabra.
        session.rollback()
        raise ConflictError("La parcela ya tiene un ciclo con ese estado.", code="cycle_conflict") from exc
    session.refresh(cycle)
    return cycle


def _previous_order():
    return (
        func.coalesce(CropCycle.harvest_date, CropCycle.sowing_date).desc().nulls_last(),
        CropCycle.created_at.desc(),
        CropCycle.id.desc(),
    )


def summary(session: Session, plot: Plot) -> CropCyclesSummary:
    cycles = list(session.scalars(
        select(CropCycle).where(CropCycle.plot_id == plot.id).order_by(*_previous_order())
    ))
    by_status = {status: next((c for c in cycles if c.status == status), None)
                 for status in ("finished", "active", "planned")}
    to_read = lambda c: CropCycleRead.model_validate(c) if c is not None else None  # noqa: E731
    return CropCyclesSummary(
        previous=to_read(by_status["finished"]),
        current=to_read(by_status["active"]),
        planned=to_read(by_status["planned"]),
        cycles=[CropCycleRead.model_validate(c) for c in cycles],
    )


def create(session: Session, plot: Plot, data: CropCycleCreate) -> CropCycle:
    cycle = CropCycle(plot_id=plot.id, **data.model_dump())
    _check_rules(session, cycle)
    session.add(cycle)
    return _commit(session, cycle)


def _get(session: Session, plot: Plot, cycle_id: UUID) -> CropCycle:
    cycle = session.scalar(select(CropCycle).where(CropCycle.id == cycle_id, CropCycle.plot_id == plot.id))
    if cycle is None:
        raise NotFoundError("Ciclo de cultivo no encontrado.", code="cycle_not_found")
    return cycle


def update(session: Session, plot: Plot, cycle_id: UUID, data: CropCycleUpdate) -> CropCycle:
    cycle = _get(session, plot, cycle_id)
    changes = data.model_dump(exclude_unset=True)
    for field in ("status", "origin"):
        if field in changes and changes[field] is None:
            raise _validation(field, f"'{field}' no puede ser null.")
    for field, value in changes.items():
        setattr(cycle, field, value)
    try:
        with session.no_autoflush:
            _check_rules(session, cycle)
    except ApiError:
        session.rollback()
        raise
    return _commit(session, cycle)


def delete(session: Session, plot: Plot, cycle_id: UUID) -> None:
    session.delete(_get(session, plot, cycle_id))
    session.commit()
