
"""
Motor de rotaciones de AgroOrbit Perú.

Permite construir y validar secuencias
de campañas agrícolas.
"""


def crear_rotacion(identificador, nombre, cultivos):
    """
    Crea una alternativa de rotación
    a partir de una lista ordenada de cultivos.
    """

    if not identificador or not nombre:
        raise ValueError(
            "La rotación necesita identificador y nombre."
        )

    if not isinstance(cultivos, list) or len(cultivos) < 2:
        raise ValueError(
            "La rotación debe tener al menos dos campañas."
        )

    campanas = []

    for indice, cultivo in enumerate(cultivos, start=1):

        if not isinstance(cultivo, str) or not cultivo.strip():
            raise ValueError(
                "Todas las campañas deben tener un cultivo válido."
            )

        campanas.append({
            "orden": indice,
            "cultivo": cultivo.strip()
        })

    return {
        "rotacion_id": identificador,
        "nombre": nombre,
        "campanas": campanas,
        "estado": "propuesta_por_validar"
    }


def validar_rotacion(rotacion):
    """
    Comprueba que la estructura de la rotación
    sea correcta y que las campañas estén ordenadas.
    """

    campanas = rotacion.get("campanas", [])

    if len(campanas) < 2:
        return False

    for indice, campana in enumerate(campanas, start=1):
        if campana.get("orden") != indice:
            return False

        cultivo = campana.get("cultivo")

        if not isinstance(cultivo, str) or not cultivo.strip():
            return False

    return True
