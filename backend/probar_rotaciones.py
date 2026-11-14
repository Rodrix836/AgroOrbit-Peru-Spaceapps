
from app.engine.rotation import crear_rotacion, validar_rotacion

rotacion_a = crear_rotacion(
    identificador="rotacion_001",
    nombre="Rotación con leguminosa",
    cultivos=["Maíz", "Frijol caupí", "Maíz"]
)

rotacion_b = crear_rotacion(
    identificador="rotacion_002",
    nombre="Rotación diversificada",
    cultivos=["Maíz", "Camote", "Frijol caupí"]
)

print("\nALTERNATIVA A:")
print(rotacion_a)

print("\n¿Es válida?", validar_rotacion(rotacion_a))

print("\nALTERNATIVA B:")
print(rotacion_b)

print("\n¿Es válida?", validar_rotacion(rotacion_b))
