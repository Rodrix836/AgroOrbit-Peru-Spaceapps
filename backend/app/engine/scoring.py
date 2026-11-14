
"""
Motor de puntuación de AgroOrbit Perú.

Compara alternativas utilizando criterios
y ponderaciones configurables.

Las puntuaciones deben venir de evaluaciones
respaldadas por datos y fuentes verificadas.
"""

CRITERIOS = ("clima", "agua", "suelo", "diversificacion")


def calcular_puntuacion(puntuaciones, pesos):
    """
    Calcula una puntuación ponderada de 0 a 100.
    """

    if set(puntuaciones) != set(CRITERIOS):
        raise ValueError("Faltan criterios o existen criterios desconocidos.")

    if set(pesos) != set(CRITERIOS):
        raise ValueError("Los pesos deben incluir los cuatro criterios.")

    for valor in puntuaciones.values():
        if not isinstance(valor, (int, float)) or not 0 <= valor <= 100:
            raise ValueError("Las puntuaciones deben estar entre 0 y 100.")

    for peso in pesos.values():
        if not isinstance(peso, (int, float)) or not 0 <= peso <= 1:
            raise ValueError("Los pesos deben estar entre 0 y 1.")

    if abs(sum(pesos.values()) - 1.0) > 0.000001:
        raise ValueError("La suma de los pesos debe ser 1.")

    total = sum(
        puntuaciones[criterio] * pesos[criterio]
        for criterio in CRITERIOS
    )

    return round(total, 2)


def comparar_rotaciones(alternativas, pesos):
    """
    Ordena las alternativas de mayor a menor puntuación.
    """

    resultados = []

    for alternativa in alternativas:
        puntuacion = calcular_puntuacion(
            alternativa["puntuaciones"],
            pesos
        )

        resultados.append({
            "rotacion_id": alternativa["rotacion_id"],
            "nombre": alternativa["nombre"],
            "puntuacion_total": puntuacion,
            "puntuaciones": alternativa["puntuaciones"],
            "estado": "evaluacion_demostrativa"
        })

    return sorted(
        resultados,
        key=lambda resultado: resultado["puntuacion_total"],
        reverse=True
    )
