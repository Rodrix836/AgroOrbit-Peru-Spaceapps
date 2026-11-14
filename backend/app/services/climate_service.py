"""Obtención de clima de una parcela con los módulos NASA ya existentes."""

from datetime import date, datetime, timezone
from math import isfinite

from pydantic import ValidationError

from app.core.exceptions import ApiError, BadRequestError, ServiceUnavailableError
from app.database.models import Plot
from app.schemas.climate import PlotClimateRead
from app.services.indicators import calcular_indicadores
from app.services.nasa.normalization import normalizar_datos
from app.services.nasa.power_client import obtener_datos_nasa


def obtener_clima_parcela(plot: Plot, fecha_inicio: date, fecha_fin: date) -> PlotClimateRead:
    if fecha_inicio > fecha_fin:
        raise BadRequestError("'from' debe ser anterior o igual a 'to'.", code="invalid_date_range")
    if fecha_fin > datetime.now(timezone.utc).date():
        raise BadRequestError("'to' no puede ser una fecha futura.", code="invalid_date_range")

    latitude, longitude = float(plot.latitude), float(plot.longitude)
    if not (isfinite(latitude) and -90 <= latitude <= 90
            and isfinite(longitude) and -180 <= longitude <= 180):
        raise ApiError(500, "invalid_plot_coordinates", "Las coordenadas de la parcela no son válidas.")

    datos = obtener_datos_nasa(
        latitude, longitude, fecha_inicio.strftime("%Y%m%d"), fecha_fin.strftime("%Y%m%d"),
    )
    if datos is None:
        raise ServiceUnavailableError("NASA POWER no está disponible.", code="nasa_power_unavailable")

    try:
        registros = normalizar_datos(datos)
        indicadores = calcular_indicadores(registros)
        return PlotClimateRead(
            plot_id=plot.id, latitude=latitude, longitude=longitude,
            fecha_inicio=fecha_inicio, fecha_fin=fecha_fin, fuente="NASA POWER",
            registros=registros, indicadores=indicadores,
        )
    except (KeyError, TypeError, ValueError, AttributeError, ValidationError) as error:
        raise ApiError(502, "nasa_power_invalid_response", "NASA POWER devolvió datos climáticos inválidos.") from error
