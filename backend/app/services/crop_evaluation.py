
"""
Evaluación climática de cultivos para AgroOrbit Perú.

Compara indicadores climáticos de NASA POWER
con requerimientos agronómicos documentados.
"""


def evaluar_temperatura(indicadores, cultivo):
    temperatura = indicadores.get("temperatura_promedio_c")

    minima = cultivo.get("temperatura_min_c")
    maxima = cultivo.get("temperatura_max_c")

    if temperatura is None:
        return {
            "estado": "sin_datos_climaticos",
            "compatible": None,
            "motivo": "No existe temperatura válida para evaluar."
        }

    if minima is None or maxima is None:
        return {
            "estado": "pendiente_datos_agronomicos",
            "compatible": None,
            "motivo": "Faltan requerimientos de temperatura del cultivo."
        }

    if minima > maxima:
        raise ValueError(
            "El rango de temperatura del cultivo es inválido."
        )

    compatible = minima <= temperatura <= maxima

    return {
        "estado": "evaluado",
        "compatible": compatible,
        "temperatura_observada_c": temperatura,
        "rango_referencia_c": [minima, maxima],
        "motivo": (
            "La temperatura promedio está dentro del rango de referencia."
            if compatible
            else "La temperatura promedio está fuera del rango de referencia."
        )
    }
