
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
        "duration_min_days": None,
        "duration_max_days": None,
        "soil_ph_min": None,
        "soil_ph_max": None,
        "soil_salinity_max_ds_m": None,
        "soil_texture_accepted": None,
        "fuentes": []
    },
    "frijol_caupi": {
        "nombre": "Frijol caupí",
        "temperatura_min_c": None,
        "temperatura_max_c": None,
        "agua_min_mm_campana": None,
        "agua_max_mm_campana": None,
        "duration_min_days": None,
        "duration_max_days": None,
        "soil_ph_min": None,
        "soil_ph_max": None,
        "soil_salinity_max_ds_m": None,
        "soil_texture_accepted": None,
        "fuentes": []
    },
    "camote": {
        "nombre": "Camote",
        "temperatura_min_c": None,
        "temperatura_max_c": None,
        "agua_min_mm_campana": None,
        "agua_max_mm_campana": None,
        "duration_min_days": None,
        "duration_max_days": None,
        "soil_ph_min": None,
        "soil_ph_max": None,
        "soil_salinity_max_ds_m": None,
        "soil_texture_accepted": None,
        "fuentes": []
    }
}


def obtener_cultivos():
    return CULTIVOS


def obtener_cultivo(cultivo_id):
    return CULTIVOS.get(cultivo_id)
