
def calcular_indicadores(registros):
    """
    Calcula indicadores climáticos a partir
    de los registros normalizados de NASA POWER.
    """

    temperaturas = [
        registro["temperatura_c"]
        for registro in registros
        if registro["temperatura_c"] is not None
    ]

    precipitaciones = [
        registro["precipitacion_mm_dia"]
        for registro in registros
        if registro["precipitacion_mm_dia"] is not None
    ]

    if temperaturas:
        temperatura_promedio = round(
            sum(temperaturas) / len(temperaturas), 2
        )
        temperatura_maxima = max(temperaturas)
        temperatura_minima = min(temperaturas)
    else:
        temperatura_promedio = None
        temperatura_maxima = None
        temperatura_minima = None

    if precipitaciones:
        precipitacion_total = round(
            sum(precipitaciones), 2
        )
    else:
        precipitacion_total = None

    total_dias = len(registros)

    cobertura_temperatura = (
        round(len(temperaturas) / total_dias * 100, 2)
        if total_dias else 0
    )

    cobertura_precipitacion = (
        round(len(precipitaciones) / total_dias * 100, 2)
        if total_dias else 0
    )

    return {
        "temperatura_promedio_c": temperatura_promedio,
        "temperatura_maxima_diaria_c": temperatura_maxima,
        "temperatura_minima_diaria_c": temperatura_minima,
        "precipitacion_total_mm": precipitacion_total,
        "dias_analizados": total_dias,
        "dias_temperatura_validos": len(temperaturas),
        "dias_precipitacion_validos": len(precipitaciones),
        "cobertura_temperatura_pct": cobertura_temperatura,
        "cobertura_precipitacion_pct": cobertura_precipitacion
    }
