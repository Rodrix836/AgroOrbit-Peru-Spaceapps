
from app.services.nasa.power_client import obtener_datos_nasa
from app.services.nasa.normalization import normalizar_datos
from app.services.indicators import calcular_indicadores

print("Consultando NASA POWER...")

datos = obtener_datos_nasa(
    latitud=-5.1945,
    longitud=-80.6328,
    fecha_inicio="20260101",
    fecha_fin="20260131"
)

if datos is not None:

    registros = normalizar_datos(datos)

    print("\nPRIMEROS 5 REGISTROS:\n")

    for registro in registros[:5]:
        print(registro)

    indicadores = calcular_indicadores(registros)

    print("\nINDICADORES CLIMÁTICOS:\n")

    for nombre, valor in indicadores.items():
        print(f"{nombre}: {valor}")

else:
    print("No se pudieron obtener datos de NASA.")
