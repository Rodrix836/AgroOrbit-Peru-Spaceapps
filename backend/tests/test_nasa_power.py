
import pytest

from app.services.nasa.normalization import normalizar_datos
from app.services.indicators import calcular_indicadores


def crear_respuesta_ejemplo():
    return {
        "parameters": {
            "T2M": {"units": "C"},
            "PRECTOTCORR": {"units": "mm/day"}
        },
        "properties": {
            "parameter": {
                "T2M": {
                    "20260101": 26.0,
                    "20260102": 28.0,
                    "20260103": -999.0
                },
                "PRECTOTCORR": {
                    "20260101": 2.0,
                    "20260102": 4.0,
                    "20260103": -999.0
                }
            }
        }
    }


def test_normalizacion():
    datos = crear_respuesta_ejemplo()
    registros = normalizar_datos(datos)

    assert len(registros) == 3
    assert registros[0]["fecha"] == "2026-01-01"
    assert registros[0]["temperatura_c"] == 26.0
    assert registros[0]["precipitacion_mm_dia"] == 2.0


def test_datos_faltantes():
    datos = crear_respuesta_ejemplo()
    registros = normalizar_datos(datos)

    assert registros[2]["temperatura_c"] is None
    assert registros[2]["precipitacion_mm_dia"] is None


def test_indicadores():
    datos = crear_respuesta_ejemplo()
    registros = normalizar_datos(datos)

    indicadores = calcular_indicadores(registros)

    assert indicadores["temperatura_promedio_c"] == 27.0
    assert indicadores["precipitacion_total_mm"] == 6.0
    assert indicadores["dias_analizados"] == 3
    assert indicadores["dias_temperatura_validos"] == 2
    assert indicadores["cobertura_temperatura_pct"] == 66.67


def test_unidad_incorrecta():
    datos = crear_respuesta_ejemplo()
    datos["parameters"]["T2M"]["units"] = "K"

    with pytest.raises(ValueError):
        normalizar_datos(datos)
