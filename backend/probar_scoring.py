
from app.engine.rotation import crear_rotacion
from app.engine.scoring import comparar_rotaciones

rotacion_a = crear_rotacion(
    "rotacion_001",
    "Rotación con leguminosa",
    ["Maíz", "Frijol caupí", "Maíz"]
)

rotacion_b = crear_rotacion(
    "rotacion_002",
    "Rotación diversificada",
    ["Maíz", "Camote", "Frijol caupí"]
)

# Valores inventados exclusivamente para probar el algoritmo.
alternativas = [
    {
        **rotacion_a,
        "puntuaciones": {
            "clima": 80,
            "agua": 70,
            "suelo": 85,
            "diversificacion": 60
        }
    },
    {
        **rotacion_b,
        "puntuaciones": {
            "clima": 75,
            "agua": 85,
            "suelo": 80,
            "diversificacion": 95
        }
    }
]

# Pesos de demostración; no están validados agronómicamente.
pesos = {
    "clima": 0.30,
    "agua": 0.30,
    "suelo": 0.25,
    "diversificacion": 0.15
}

resultados = comparar_rotaciones(alternativas, pesos)

print("\nCOMPARACIÓN DE ROTACIONES\n")

for posicion, resultado in enumerate(resultados, start=1):
    print(f"Alternativa {posicion}: {resultado['nombre']}")
    print(f"Puntuación: {resultado['puntuacion_total']}/100")
    print(f"Estado: {resultado['estado']}")
    print("-" * 40)
