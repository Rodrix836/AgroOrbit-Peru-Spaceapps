# Reproducir la entrega técnica de recomendaciones

Versión actual: **`motor-1.0`** (`app/engine/recommendation.py`). Esta entrega no cambia el motor, su puntuación, la API ni el catálogo real; por ello no incrementa la versión. Los dos archivos de `examples/entrega-milene-*.json` son respuestas del **servicio real** validadas con `RecommendationResponse`, generadas por `scripts/reproducir_recomendaciones.py` en SQLite en memoria. El script no usa credenciales, Supabase ni red.

## Comandos desde la raíz del repositorio en PowerShell

```powershell
& .\backend\.venv\Scripts\python.exe .\backend\scripts\reproducir_recomendaciones.py --case ok-demo
& .\backend\.venv\Scripts\python.exe .\backend\scripts\reproducir_recomendaciones.py --case insufficient-data
Push-Location .\backend
& .\.venv\Scripts\python.exe -m pytest -q
Pop-Location
```

El intérprete de `backend/.venv` es Python 3.11.9. `--output RUTA` permite escribir un JSON temporal sin reemplazar el ejemplo entregado. Desde `backend/`, los comandos equivalentes son `python scripts/reproducir_recomendaciones.py --case ok-demo`, `python scripts/reproducir_recomendaciones.py --case insufficient-data` y `python -m pytest -q` con el entorno activado.

## Datos de ambos casos

- ID de parcela fijo `11111111-1111-4111-8111-111111111111` y coordenadas representativas (-4,97; -80,89). **No representa una parcela agrícola medida.**
- Serie diaria constante de 732 días terminados el 15/11/2026: T2M=26,5 °C y PRECTOTCORR=0,5 mm/día. Son datos **sintéticos insertados en SQLite**. El campo contractual `context.power.source` dice `NASA POWER` porque el servicio etiqueta así la tabla `nasa_observation`; en estos ejemplos **no se consultó NASA ni se usaron observaciones reales**. El supuesto del ejemplo `ok` lo advierte expresamente.
- Una lectura ESP32 de prueba (`quality_flag=test`) confirma que no interviene en la puntuación.
- `insufficient-data`: agua declarada `low`; sin fecha planificada, cultivo anterior ni textura. Usa el catálogo real, todavía incompleto. Por ello devuelve `insufficient_data`, `selected_id=null`, `alternatives=[]` y motivos concretos. Representa la **estructura de faltantes** del caso Valle del Chira; todo el fixture de parcela, clima y sensor es sintético. El generador lo declara en `context.notice`, campo textual ya existente del contrato.
- `ok-demo`: añade textura `franco`, ciclo anterior `maiz` y fecha planificada 01/12/2026. **Solo dentro de este caso**, reutiliza `synthetic_catalog` y `synthetic_evaluator` de `tests/synthetic_recommendation.py`, compartidos con `tests/test_rotation_engine_api.py`. Los requisitos ficticios y la URL `example.invalid` nunca se escriben en `app/data/crops.py`.

## Puntajes y orden

El fixture asigna `clima=50` y `diversificacion=50` a cada par. Para `agua`, promedia valores inventados por cultivo (`maiz=20`, `frijol_caupi=60`, `camote=90`); para `suelo`, también (`20`, `90`, `40`). La finalidad es ensayar el ranking, **no afirmar ahorro de agua ni mejora del suelo**. Cada alternativa incluye en `reasons` sus cuatro puntajes y pesos con el prefijo `SYNTHETIC desglose`, dentro de los campos existentes del contrato. Sus fuentes y limitaciones también indican que es una prueba.

Para `save_water`, los pesos sintéticos son clima 0,1; agua 0,7; suelo 0,1; diversificación 0,1. Ejemplo: `frijol_caupi__camote` obtiene `50×0,1 + 75×0,7 + 65×0,1 + 50×0,1 = 69,00`. `engine.scoring` redondea a dos decimales y ordena de mayor a menor. Un empate conserva el orden de generación de candidatos del catálogo; se devuelven como máximo tres. `rank=1` determina `selected_id`. Cada alternativa tiene dos campañas consecutivas con duración mínima del fixture (100 días cada una).

Los pesos sintéticos para `improve_soil` son clima 0,1; agua 0,1; suelo 0,7; diversificación 0,1. Ambos juegos figuran en `tests/synthetic_recommendation.py`; el ejemplo entregado usa `save_water`.

## Comparación reproducible

`created_at` es la hora UTC del cálculo y cambia en cada ejecución. La prueba `test_reproduccion_recomendaciones.py` calcula ambos casos otra vez y compara el JSON guardado con la nueva respuesta **eliminando únicamente el campo superior `created_at` en ambas copias de comparación**. Antes comprueba que ese campo existe y es una fecha UTC válida. No cambia el archivo, ni fechas de campaña, identificadores, indicadores, supuestos, puntajes, orden o motivos. También verifica el desglose y la fórmula.

Para una evaluación agronómica real aún faltan requisitos de cultivos y validación de sus fuentes, criterios de puntuación y pesos justificados, cobertura suficiente por ventana de campaña y una regla explícita para usar historial de cultivos y condiciones del suelo. Véanse [evidencia-agronomica.md](evidencia-agronomica.md) y [entradas-motor-recomendaciones.md](entradas-motor-recomendaciones.md). La salida real sigue siendo `insufficient_data` mientras falte esa evidencia.
