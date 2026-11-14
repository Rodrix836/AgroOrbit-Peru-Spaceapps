
from datetime import datetime
from math import isfinite


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

    registros = []

    for fecha in sorted(temperaturas.keys() | precipitaciones.keys()):
        temperatura = temperaturas.get(fecha)
        lluvia = precipitaciones.get(fecha)

        # NASA POWER suele utilizar -999 para datos faltantes.
        for valor in (temperatura, lluvia):
            if valor is not None and (isinstance(valor, bool)
                                     or not isinstance(valor, (int, float))
                                     or not isfinite(valor)):
                raise ValueError("Valor climático inválido en la respuesta de NASA POWER.")
        if temperatura is not None and temperatura <= -900:
            temperatura = None
        if lluvia is not None and lluvia <= -900:
            lluvia = None

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
