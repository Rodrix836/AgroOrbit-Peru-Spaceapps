
import pytest

from app.engine.rotation import crear_rotacion, validar_rotacion
from app.engine.scoring import (
    calcular_puntuacion,
    comparar_rotaciones
)


PESOS = {
    "clima": 0.30,
    "agua": 0.30,
    "suelo": 0.25,
    "diversificacion": 0.15
}


def test_crear_rotacion():
    rotacion = crear_rotacion(
        "r1", "Prueba", ["Maíz", "Frijol"]
    )

    assert len(rotacion["campanas"]) == 2
    assert rotacion["campanas"][0]["orden"] == 1
    assert validar_rotacion(rotacion) is True


def test_rotacion_invalida():
    with pytest.raises(ValueError):
        crear_rotacion("r1", "Prueba", ["Maíz"])


def test_calcular_puntuacion():
    valores = {
        "clima": 80,
        "agua": 70,
        "suelo": 85,
        "diversificacion": 60
    }

    assert calcular_puntuacion(valores, PESOS) == 75.25


def test_pesos_invalidos():
    valores = {
        "clima": 80,
        "agua": 70,
        "suelo": 85,
        "diversificacion": 60
    }

    pesos_invalidos = dict(PESOS)
    pesos_invalidos["clima"] = 0.50

    with pytest.raises(ValueError):
        calcular_puntuacion(valores, pesos_invalidos)


def test_comparar_rotaciones():
    alternativas = [
        {
            "rotacion_id": "r1",
            "nombre": "Alternativa A",
            "puntuaciones": {
                "clima": 80,
                "agua": 70,
                "suelo": 85,
                "diversificacion": 60
            }
        },
        {
            "rotacion_id": "r2",
            "nombre": "Alternativa B",
            "puntuaciones": {
                "clima": 75,
                "agua": 85,
                "suelo": 80,
                "diversificacion": 95
            }
        }
    ]

    resultados = comparar_rotaciones(alternativas, PESOS)

    assert resultados[0]["rotacion_id"] == "r2"
    assert resultados[0]["puntuacion_total"] == 82.25
    assert resultados[1]["puntuacion_total"] == 75.25
