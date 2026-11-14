
from datetime import datetime


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

    for fecha in sorted(temperaturas.keys()):
        temperatura = temperaturas[fecha]
        lluvia = precipitaciones.get(fecha)

        # NASA POWER suele utilizar -999 para datos faltantes.
        if temperatura is None or temperatura <= -900:
            temperatura = None

        if lluvia is None or lluvia <= -900:
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
