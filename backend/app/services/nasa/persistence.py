"""Importa NASA POWER diario a public.nasa_observation y lo lee para el frontend.

Reglas (backend/docs/nasa-persistence.md):
- Una fila por parcela, variable y día LST; upsert por (plot_id, variable, observed_on).
- header.fill_value se guarda como null; 0 mm de lluvia es un día válido.
- Un null nuevo no reemplaza un valor válido ya guardado para el mismo punto.
- El historial solo devuelve filas del punto actual de la parcela.
"""

from datetime import date, datetime, timedelta, timezone
from math import isfinite
from uuid import uuid4

from sqlalchemy import and_, case, select
from sqlalchemy.orm import Session

from app.core.exceptions import ApiError, BadRequestError, ServiceUnavailableError
from app.database.models import NasaObservation, Plot
from app.database.models.nasa_observation import NASA_SOURCE, NASA_TIME_STANDARD, NASA_UNITS
from app.schemas.climate import NasaImportResult
from app.services.nasa.normalization import normalizar_datos
from app.services.nasa.power_client import obtener_datos_nasa

DEFAULT_DAYS = 90
MAX_DAYS = 731  # dos años por petición
CHUNK = 500

# Campo normalizado de Milene -> variable de POWER.
FIELDS = {"T2M": "temperatura_c", "PRECTOTCORR": "precipitacion_mm_dia"}


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


def _build_rows(plot: Plot, registros: list[dict], start: date, end: date, fetched_at: datetime) -> list[dict]:
    rows = []
    for registro in registros:
        observed_on = date.fromisoformat(registro["fecha"])
        if not start <= observed_on <= end:
            continue
        for variable, field in FIELDS.items():
            value = registro[field]
            if value is not None:
                if not isfinite(value):
                    raise _invalid()
                # Mismas reglas que el check de la tabla: evita un 500 por IntegrityError.
                if variable == "T2M" and not -900 < value < 900:
                    raise _invalid()
                if variable == "PRECTOTCORR" and value < 0:
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
    )
    if datos is None:
        raise ServiceUnavailableError("NASA POWER no está disponible.", code="nasa_power_unavailable")
    try:
        registros = normalizar_datos(datos)
    except (KeyError, TypeError, ValueError, AttributeError) as error:
        raise _invalid() from error

    fetched_at = datetime.now(timezone.utc)
    rows = _build_rows(plot, registros, start, end, fetched_at)
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
        variables=list(FIELDS),
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
