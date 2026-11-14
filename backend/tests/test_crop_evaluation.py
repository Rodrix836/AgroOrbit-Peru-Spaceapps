
from app.services.crop_evaluation import evaluar_temperatura


def test_sin_datos_agronomicos():
    indicadores = {"temperatura_promedio_c": 27}
    cultivo = {
        "temperatura_min_c": None,
        "temperatura_max_c": None
    }

    resultado = evaluar_temperatura(indicadores, cultivo)

    assert resultado["estado"] == "pendiente_datos_agronomicos"
    assert resultado["compatible"] is None


def test_temperatura_compatible():
    indicadores = {"temperatura_promedio_c": 27}
    cultivo = {
        "temperatura_min_c": 20,
        "temperatura_max_c": 30
    }

    resultado = evaluar_temperatura(indicadores, cultivo)

    assert resultado["estado"] == "evaluado"
    assert resultado["compatible"] is True


def test_temperatura_no_compatible():
    indicadores = {"temperatura_promedio_c": 35}
    cultivo = {
        "temperatura_min_c": 20,
        "temperatura_max_c": 30
    }

    resultado = evaluar_temperatura(indicadores, cultivo)

    assert resultado["compatible"] is False


def test_sin_datos_climaticos():
    indicadores = {"temperatura_promedio_c": None}
    cultivo = {
        "temperatura_min_c": 20,
        "temperatura_max_c": 30
    }

    resultado = evaluar_temperatura(indicadores, cultivo)

    assert resultado["estado"] == "sin_datos_climaticos"
