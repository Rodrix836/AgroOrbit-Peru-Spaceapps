"""Importa NASA POWER diario a public.nasa_observation y lo lee para el frontend.

Reglas (backend/docs/nasa-persistence.md):
- Una fila por parcela, variable y día LST; upsert por (plot_id, variable, observed_on).
- Variables: las 9 de NASA_UNITS (T2M, PRECTOTCORR, entradas de ETo FAO-56 y humedad del suelo
  GWETTOP/GWETROOT). Si POWER declara otra unidad, no se guarda nada (502).
- header.fill_value se guarda como null; 0 mm de lluvia es un día válido.
- Un null nuevo no reemplaza un valor válido ya guardado para el mismo punto.
- El historial solo devuelve filas del punto actual de la parcela.
"""

from datetime import date, datetime, timedelta, timezone
from math import isfinite
from numbers import Real
from uuid import uuid4

from sqlalchemy import and_, case, select
from sqlalchemy.orm import Session

from app.core.exceptions import ApiError, BadRequestError, ServiceUnavailableError
from app.database.models import NasaObservation, Plot
from app.database.models.nasa_observation import (
    NASA_SOURCE,
    NASA_TIME_STANDARD,
    NASA_UNITS,
    nasa_value_is_valid,
)
from app.schemas.climate import NasaImportResult
from app.services.nasa.normalization import _faltante_a_none, obtener_fill_value
from app.services.nasa.power_client import obtener_datos_nasa

DEFAULT_DAYS = 90
MAX_DAYS = 4018  # 11 años por petición (POWER responde 9 variables x 11 años en ~2 s)
CHUNK = 500
VARIABLES = tuple(NASA_UNITS)


def resolve_range(start: date | None, end: date | None) -> tuple[date, date]:
    today = datetime.now(timezone.utc).date()
    end = end or today
    start = start or end - timedelta(days=DEFAULT_DAYS - 1)
    if start > end:
        raise BadRequestError("'start' debe ser anterior o igual a 'end'.", code="invalid_date_range")
    if end > today:
        raise BadRequestError("'end' no puede ser una fecha futura.", code="invalid_date_range")
    if (end - start).days + 1 > MAX_DAYS:
        raise BadRequestError(f"El rango no puede superar {MAX_DAYS} días.", code="invalid_date_range")
    return start, end


def _invalid(message: str = "NASA POWER devolvió datos climáticos inválidos.") -> ApiError:
    return ApiError(502, "nasa_power_invalid_response", message)


def _series(datos: dict) -> dict[str, dict[date, float | None]]:
    """Variable -> {día LST: valor o None}. Verifica unidades y tipos; fill_value -> None."""
    metadata = datos["parameters"]
    parameters = datos["properties"]["parameter"]
    fill_value = obtener_fill_value(datos)
    series = {}
    for variable, unit in NASA_UNITS.items():
        if metadata[variable]["units"] != unit:
            raise ValueError(f"Unidad inesperada para {variable}: {metadata[variable]['units']}")
        days = {}
        for day, value in parameters[variable].items():
            if value is not None and (isinstance(value, bool) or not isinstance(value, Real)
                                      or not isfinite(value)):
                raise ValueError(f"Valor inválido en {variable}.")
            days[datetime.strptime(day, "%Y%m%d").date()] = _faltante_a_none(value, fill_value)
        series[variable] = days
    return series


def _build_rows(plot: Plot, series: dict[str, dict[date, float | None]], start: date, end: date,
                fetched_at: datetime) -> list[dict]:
    rows = []
    for variable, days in series.items():
        for observed_on, value in sorted(days.items()):
            if not start <= observed_on <= end:
                continue
            # Mismas reglas que el check de la tabla: evita un 500 por IntegrityError.
            if value is not None and not nasa_value_is_valid(variable, value):
                raise _invalid()
            rows.append({
                "id": uuid4(),
                "plot_id": plot.id,
                "variable": variable,
                "observed_on": observed_on,
                "value": value,
                "unit": NASA_UNITS[variable],
                "source": NASA_SOURCE,
                "time_standard": NASA_TIME_STANDARD,
                "latitude": plot.latitude,
                "longitude": plot.longitude,
                "fetched_at": fetched_at,
            })
    return rows


def _insert(session: Session):
    dialect = session.get_bind().dialect.name
    if dialect == "postgresql":
        from sqlalchemy.dialects.postgresql import insert
    elif dialect == "sqlite":
        from sqlalchemy.dialects.sqlite import insert
    else:  # pragma: no cover - solo se usan Supabase (PostgreSQL) y SQLite en pruebas
        raise RuntimeError(f"Dialecto no soportado para upsert: {dialect}")
    return insert


def _upsert(session: Session, rows: list[dict]) -> None:
    insert = _insert(session)
    table = NasaObservation.__table__
    for i in range(0, len(rows), CHUNK):
        stmt = insert(table).values(rows[i:i + CHUNK])
        new = stmt.excluded
        same_point = and_(table.c.latitude == new.latitude, table.c.longitude == new.longitude)
        stmt = stmt.on_conflict_do_update(
            index_elements=[table.c.plot_id, table.c.variable, table.c.observed_on],
            set_={
                # Un faltante nuevo no pisa un dato válido del mismo punto.
                "value": case((and_(new.value.is_(None), same_point), table.c.value), else_=new.value),
                "unit": new.unit,
                "source": new.source,
                "time_standard": new.time_standard,
                "latitude": new.latitude,
                "longitude": new.longitude,
                "fetched_at": new.fetched_at,
            },
        )
        session.execute(stmt)


def import_power(session: Session, plot: Plot, start: date | None = None,
                 end: date | None = None) -> NasaImportResult:
    start, end = resolve_range(start, end)
    datos = obtener_datos_nasa(
        float(plot.latitude), float(plot.longitude), start.strftime("%Y%m%d"), end.strftime("%Y%m%d"),
        variables=VARIABLES,
    )
    if datos is None:
        raise ServiceUnavailableError("NASA POWER no está disponible.", code="nasa_power_unavailable")
    try:
        series = _series(datos)
    except (KeyError, TypeError, ValueError, AttributeError) as error:
        raise _invalid() from error

    fetched_at = datetime.now(timezone.utc)
    rows = _build_rows(plot, series, start, end, fetched_at)
    if rows:
        try:
            _upsert(session, rows)
            session.commit()
        except Exception:
            session.rollback()
            raise

    return NasaImportResult(
        plot_id=plot.id,
        latitude=float(plot.latitude),
        longitude=float(plot.longitude),
        start=start,
        end=end,
        source=NASA_SOURCE,
        time_standard=NASA_TIME_STANDARD,
        variables=list(VARIABLES),
        unidades=dict(NASA_UNITS),
        dias=len({row["observed_on"] for row in rows}),
        filas_guardadas=len(rows),
        valores_faltantes=sum(row["value"] is None for row in rows),
        fetched_at=fetched_at,
    )


def list_observations(
    session: Session,
    plot: Plot,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
    variable: str | None = None,
) -> list[NasaObservation]:
    """Observaciones del punto actual de la parcela, por fecha ascendente."""
    if date_from and date_to and date_from > date_to:
        raise BadRequestError("'from' debe ser anterior o igual a 'to'.", code="invalid_date_range")
    query = select(NasaObservation).where(
        NasaObservation.plot_id == plot.id,
        NasaObservation.latitude == plot.latitude,
        NasaObservation.longitude == plot.longitude,
    )
    if date_from is not None:
        query = query.where(NasaObservation.observed_on >= date_from)
    if date_to is not None:
        query = query.where(NasaObservation.observed_on <= date_to)
    if variable is not None:
        query = query.where(NasaObservation.variable == variable)
    return list(session.scalars(query.order_by(NasaObservation.observed_on, NasaObservation.variable)))
