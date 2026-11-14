
"""
Catálogo inicial de cultivos de AgroOrbit Perú.

Los requerimientos agronómicos se completarán
con fuentes verificadas.
"""

CULTIVOS = {
    "maiz": {
        "nombre": "Maíz",
        "temperatura_min_c": None,
        "temperatura_max_c": None,
        "agua_min_mm_campana": None,
        "agua_max_mm_campana": None,
        "fuentes": []
    },
    "frijol_caupi": {
        "nombre": "Frijol caupí",
        "temperatura_min_c": None,
        "temperatura_max_c": None,
        "agua_min_mm_campana": None,
        "agua_max_mm_campana": None,
        "fuentes": []
    },
    "camote": {
        "nombre": "Camote",
        "temperatura_min_c": None,
        "temperatura_max_c": None,
        "agua_min_mm_campana": None,
        "agua_max_mm_campana": None,
        "fuentes": []
    }
}


def obtener_cultivos():
    return CULTIVOS


def obtener_cultivo(cultivo_id):
    return CULTIVOS.get(cultivo_id)
