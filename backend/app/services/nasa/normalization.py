
from datetime import datetime
from math import isfinite

FILL_VALUE_POR_DEFECTO = -999.0
UNIDADES = {"temperatura_c": "C", "precipitacion_mm_dia": "mm/day"}


def obtener_fill_value(datos):
    valor = (datos.get("header") or {}).get("fill_value", FILL_VALUE_POR_DEFECTO)
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or not isfinite(valor):
        raise ValueError("fill_value inválido en la respuesta de NASA POWER.")
    return float(valor)


def _faltante_a_none(valor, fill_value):
    # Igual al fill_value declarado, o cualquier centinela <= -900 (-999 es el habitual).
    if valor is None or valor == fill_value or valor <= -900:
        return None
    return valor


def normalizar_datos(datos):
    """
    Normaliza temperatura y precipitación de NASA POWER.
    Verifica unidades y descarta valores faltantes.
    """

    parametros = datos["properties"]["parameter"]
    metadatos = datos["parameters"]

    unidad_temperatura = metadatos["T2M"]["units"]
    unidad_precipitacion = metadatos["PRECTOTCORR"]["units"]

    # Verificamos las unidades antes de procesar.
    if unidad_temperatura != "C":
        raise ValueError(
            f"Unidad de temperatura inesperada: {unidad_temperatura}"
        )

    if unidad_precipitacion != "mm/day":
        raise ValueError(
            f"Unidad de precipitación inesperada: {unidad_precipitacion}"
        )

    temperaturas = parametros["T2M"]
    precipitaciones = parametros["PRECTOTCORR"]

    # Valor de relleno declarado por POWER (header.fill_value); -999 si no viene.
    fill_value = obtener_fill_value(datos)

    registros = []

    for fecha in sorted(temperaturas.keys() | precipitaciones.keys()):
        temperatura = temperaturas.get(fecha)
        lluvia = precipitaciones.get(fecha)

        for valor in (temperatura, lluvia):
            if valor is not None and (isinstance(valor, bool)
                                     or not isinstance(valor, (int, float))
                                     or not isfinite(valor)):
                raise ValueError("Valor climático inválido en la respuesta de NASA POWER.")
        temperatura = _faltante_a_none(temperatura, fill_value)
        lluvia = _faltante_a_none(lluvia, fill_value)

        fecha_formateada = datetime.strptime(
            fecha, "%Y%m%d"
        ).strftime("%Y-%m-%d")

        registros.append({
            "fecha": fecha_formateada,
            "temperatura_c": temperatura,
            "precipitacion_mm_dia": lluvia,
            "fuente": "NASA POWER"
        })

    return registros
