
"""Catálogo agronómico con procedencia por parámetro."""

CULTIVOS = {
    "maiz": {
        "nombre": "Maíz",
        "temperatura_min_c": 20,
        "temperatura_max_c": 30,
        "agua_min_mm_campana": 500,
        "agua_max_mm_campana": 800,
        "duration_min_days": 125,
        "duration_max_days": 180,
        "soil_ph_min": None,
        "soil_ph_max": None,
        "soil_salinity_max_ds_m": None,
        "soil_texture_accepted": None,
        "fuentes": [
            {
                "titulo": "The Global Agro-Ecological Zoning version 4: Crop profile: Maize",
                "url": "https://s3.eu-west-1.amazonaws.com/data.gaezdev.aws.fao.org/crop_profiles/GAEZ_Crop_profile_maize.pdf",
                "campos": ["temperatura_min_c", "temperatura_max_c"],
                "nota": (
                    "20-30 °C es el rango óptimo citado para fotosíntesis; no "
                    "son límites absolutos de supervivencia. El perfil también "
                    "informa lluvia anual por separado, no utilizada como agua "
                    "por campaña."
                ),
            },
            {
                "titulo": "Irrigation Water Management: Irrigation Water Needs",
                "url": "https://www.fao.org/4/s2022e/s2022e02.htm",
                "campos": ["agua_min_mm_campana", "agua_max_mm_campana"],
                "nota": (
                    "Training manual no. 3, Table 5: 500-800 mm de necesidad "
                    "hídrica estacional aproximada (evapotranspiración del "
                    "cultivo), no lluvia anual ni riego aplicado."
                ),
            },
            {
                "titulo": "Irrigation Water Management: Irrigation Water Needs",
                "url": "https://www.fao.org/4/s2022e/s2022e07.htm",
                "campos": ["duration_min_days", "duration_max_days"],
                "nota": (
                    "Chapter 3, Section 3.2.2, Table 6: 125-180 días para "
                    "maíz de grano, como duración indicativa/aproximada desde "
                    "siembra hasta el último día de cosecha. Varía según "
                    "clima, variedad y fecha de siembra; se prefieren datos locales."
                ),
            },
        ]
    },
    "frijol_caupi": {
        "nombre": "Frijol caupí",
        "temperatura_min_c": 20,
        "temperatura_max_c": 35,
        "agua_min_mm_campana": None,
        "agua_max_mm_campana": None,
        "duration_min_days": 60,
        "duration_max_days": 240,
        "duration_by_harvest": {
            "green_pods": {"min_days": 60, "max_days": 160},
            "dry_seed": {"min_days": 90, "max_days": 240},
        },
        "soil_ph_min": None,
        "soil_ph_max": None,
        "soil_salinity_max_ds_m": None,
        "soil_texture_accepted": None,
        "fuentes": [
            {
                "titulo": "FAO EcoCrop data sheet: Vigna unguiculata ssp. unguiculata",
                "url": "https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=10835",
                "campos": [
                    "temperatura_min_c",
                    "temperatura_max_c",
                    "duration_min_days",
                    "duration_max_days",
                ],
                "nota": (
                    "20-35 °C es el rango óptimo, no el límite absoluto. "
                    "La ficha de cultivo indica 60-240 días como rango general."
                ),
            },
            {
                "titulo": "FAO EcoCrop crop profile: Vigna unguiculata ssp. unguiculata",
                "url": "https://ecocrop.apps.fao.org/ecocrop/srv/en/cropView?id=10835",
                "campos": ["duration_by_harvest"],
                "nota": (
                    "Distingue producción de vainas (60-160 días) y semilla "
                    "(90-180 días, o hasta 240). Los tiempos dependen del "
                    "destino de cosecha y del material cultivado."
                ),
            },
            {
                "titulo": "Cowpea evapotranspiration and crop coefficient in the Gurgueia Valley, Piaui State, Brazil",
                "url": "https://doi.org/10.15809/irriga.2008v13n2p182-190",
                "campos": ["agua_min_mm_campana", "agua_max_mm_campana"],
                "nota": (
                    "Reporta ETc de 288.5 mm/ciclo para cv. BR-17 Gurguéia "
                    "en un sitio y campaña. Es un resultado específico, no "
                    "suficiente para establecer mínimos y máximos generales; "
                    "los campos de agua permanecen None."
                ),
            },
        ]
    },
    "camote": {
        "nombre": "Camote",
        "temperatura_min_c": 18,
        "temperatura_max_c": 28,
        "agua_min_mm_campana": None,
        "agua_max_mm_campana": None,
        "duration_min_days": 80,
        "duration_max_days": 170,
        "soil_ph_min": None,
        "soil_ph_max": None,
        "soil_salinity_max_ds_m": None,
        "soil_texture_accepted": None,
        "fuentes": [
            {
                "titulo": "FAO EcoCrop data sheet: Ipomoea batatas",
                "url": "https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=1265",
                "campos": [
                    "temperatura_min_c",
                    "temperatura_max_c",
                    "duration_min_days",
                    "duration_max_days",
                ],
                "nota": (
                    "18-28 °C es el rango óptimo de EcoCrop, no sus límites "
                    "absolutos (10-38 °C); el ciclo 80-170 días es un rango "
                    "general de cultivo, dependiente de variedad y ambiente."
                ),
            },
            {
                "titulo": "Cultivation harvesting and storage of sweet potato products",
                "url": "https://www.fao.org/4/t0554e/T0554E14.htm",
                "campos": ["duration_min_days", "duration_max_days"],
                "nota": (
                    "Referencia varietal y ambiental: ciclo usual 100-150 "
                    "días; la variedad CENSA 85-48 produjo en 90-100 días "
                    "bajo condiciones experimentales en Cuba. No es un rango "
                    "universal que sustituya EcoCrop."
                ),
            },
            {
                "titulo": "How Sweetpotato Grows",
                "url": "https://cipotato.org/sweetpotato/how-sweetpotato-grows/",
                "campos": ["duration_min_days", "duration_max_days"],
                "nota": (
                    "CIP indica maduración promedio cercana a cuatro meses y "
                    "algunas variedades tempranas listas en dos meses; es una "
                    "referencia adicional, no un máximo."
                ),
            },
            {
                "titulo": "Effects of Water Availability and Vine Harvesting Frequency on the Productivity of Sweet Potato in Southern Mozambique. II. Crop Water Use",
                "url": "https://www.cambridge.org/core/journals/experimental-agriculture/article/abs/effects-of-water-availability-and-vine-harvesting-frequency-on-the-productivity-of-sweet-potato-in-southern-mozambique-ii-crop-water-use/CEF3B2363F673AA412F92E54A9039027",
                "campos": ["agua_min_mm_campana", "agua_max_mm_campana"],
                "nota": (
                    "Estudio de cv. TIS 2534 en Mozambique: uso real del "
                    "cultivo de unos 800 mm en lluvias y 550 mm en época seca "
                    "con riego suficiente; en secano reporta 360 y 180 mm. "
                    "Son valores estacionales de un sitio/variedad y no una "
                    "serie general de ETc para fijar mínimos y máximos; los "
                    "campos de agua permanecen None."
                ),
            },
        ]
    }
}


def obtener_cultivos():
    return CULTIVOS


def obtener_cultivo(cultivo_id):
    return CULTIVOS.get(cultivo_id)
