
import logging

import requests

logger = logging.getLogger("agroorbit.nasa")

NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"


def obtener_datos_nasa(latitud, longitud, fecha_inicio, fecha_fin):
    """
    Consulta datos climáticos diarios de NASA POWER.

    T2M: Temperatura del aire a 2 metros.
    PRECTOTCORR: Precipitación corregida.
    """

    parametros = {
        "parameters": "T2M,PRECTOTCORR",
        "community": "AG",
        "longitude": longitud,
        "latitude": latitud,
        "start": fecha_inicio,
        "end": fecha_fin,
        "format": "JSON",
        # Días en hora solar local (LST), como espera public.nasa_observation.
        "time-standard": "LST"
    }

    try:
        respuesta = requests.get(
            NASA_POWER_URL,
            params=parametros,
            timeout=60
        )

        respuesta.raise_for_status()
        datos = respuesta.json()

        return datos

    except requests.exceptions.RequestException:
        logger.warning("No se pudo consultar NASA POWER", exc_info=True)
        return None


if __name__ == "__main__":

    print("Consultando datos climáticos de NASA POWER...")

    datos = obtener_datos_nasa(
        latitud=-4.97,  # Parcela demostrativa – Valle del Chira (Sullana, Piura)
        longitud=-80.89,
        fecha_inicio="20260101",
        fecha_fin="20260131"
    )

    if datos:
        clima = datos["properties"]["parameter"]

        print("\nTEMPERATURAS DEL AIRE:")
        print(clima["T2M"])

        print("\nPRECIPITACIONES:")
        print(clima["PRECTOTCORR"])

        print("\nConsulta realizada correctamente.")
