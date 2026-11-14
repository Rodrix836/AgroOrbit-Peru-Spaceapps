
from app.services.nasa.power_client import obtener_datos_nasa
from app.services.nasa.normalization import normalizar_datos
from app.services.indicators import calcular_indicadores
from app.services.crop_evaluation import evaluar_temperatura
from app.data.crops import obtener_cultivo


print("Consultando NASA POWER...")

datos = obtener_datos_nasa(
    latitud=-5.1945,
    longitud=-80.6328,
    fecha_inicio="20260101",
    fecha_fin="20260131"
)

if datos is not None:
    registros = normalizar_datos(datos)
    indicadores = calcular_indicadores(registros)

    cultivo = obtener_cultivo("maiz")

    resultado = evaluar_temperatura(indicadores, cultivo)

    print("\nCULTIVO:", cultivo["nombre"])
    print("Temperatura promedio:", indicadores["temperatura_promedio_c"])
    print("\nRESULTADO DE EVALUACIÓN:")
    print(resultado)

else:
    print("No se pudieron obtener datos climáticos.")
