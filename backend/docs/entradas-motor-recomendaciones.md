# Entradas y reglas actuales del motor de recomendaciones

Fuente normativa de la respuesta: [api-contract.md](api-contract.md). Esta página describe el comportamiento implementado, no propone un nuevo contrato. Flujo: `POST /api/recommendations` → `recommendation_service.recommend` → `rotation_engine.recommend_rotations` → `engine.recommendation.motor` → `engine.scoring`.

| Entrada | Procedencia y formato | Validación actual | Si falta o es insuficiente |
|---|---|---|---|
| Cultivo anterior y ciclos | `crop_cycle` de la parcela. Un ciclo `finished` contiene `crop_code` (`maiz`, `frijol_caupi`, `camote`); puede haber `active` y un único `planned`. Fechas `AAAA-MM-DD`. | El servicio exige que exista algún `finished`; la tabla y sus rutas validan código, estado y fechas. El motor actual **no usa el código anterior al puntuar diversificación**: solo comprueba existencia. | `plot.previous_crop` en `missing`; no se llama al motor. |
| Inicio de siembra | `request.start_on` (`AAAA-MM-DD`) o `sowing_date` del ciclo `planned`. La petición prevalece. | Pydantic valida fecha; las campañas parten de ella sin huecos. | `plot.next_sowing_date`; `context.start_on=null`. |
| Disponibilidad de agua | `plot.water_availability`: `low`, `medium` o `high`. No se acepta en la petición. | La parcela valida el enum; el adaptador pasa el valor al evaluador. No hay conversión actual a volumen de agua. | `plot.water_availability`; no se llama al motor. |
| Textura y otras condiciones del suelo | `plot.soil_texture` es texto; `soil_ph` (0–14) y `soil_salinity_ds_m` (dS/m, ≥0) son campos opcionales de la parcela. | El servicio exige **solo textura**. La ficha de cada cultivo exige pH mínimo/máximo, salinidad máxima y texturas aceptadas con fuente para ser candidato. No hay aún fórmula real de compatibilidad de suelo. | Falta de textura: `plot.soil_texture`. Falta de requisitos del cultivo: `crops.<id>.requirements` si quedan menos de dos cultivos completos. La ausencia de pH o salinidad medidos en la parcela no bloquea por sí sola hoy; debe resolverse antes de una evaluación real que los use. |
| Histórico NASA POWER | `nasa_observation` del punto actual, fechas LST anteriores a `start_on`; T2M en °C y PRECTOTCORR en mm/día. `context.power.indicators` resume los días. | Umbral provisional: ≥365 días con T2M válido en todo el historial. Para cada campaña, el adaptador busca las mismas fechas hasta cinco años atrás y exige algún promedio de temperatura. No exige aún cobertura mínima por ventana ni precipitación válida para cada una. | `climate.history`; no se puntúa. Un cambio de coordenadas deja fuera el historial del punto anterior. |
| Horizonte | `request.horizon_days`, entero de 90 a 730; defecto 365. | Cada par de campañas usa la duración mínima de cada ficha y debe caber en el horizonte. | Si ninguna rotación cabe: `request.horizon_days` en `missing`. |
| Prioridad | `request.priority`: `save_water` o `improve_soil`. La prioridad guardada en la parcela no sustituye este campo. | Debe tener un juego de cuatro pesos con suma 1. | `engine.priority_weights.<priority>` si se superan los bloqueos anteriores pero falta ese juego. |
| Catálogo y fuentes | `app/data/crops.py`; diez campos obligatorios por cultivo, con valor y al menos una entrada en `fuentes[].campos` que cite el campo. | El adaptador necesita al menos dos cultivos completos. Comprueba título y forma HTTP(S) de la URL; **no verifica el contenido ni la aplicabilidad de la publicación**. | Con menos de dos completos, `crops.<id>.requirements`. Si hay dos, omite cultivos incompletos y los menciona en `limitations`. |
| Evaluaciones de clima, agua, suelo y diversificación | `EVALUATION_PROVIDER(plot, request, candidates)` debe entregar `evaluations[candidate_id][criterio]` con `score` 0–100, razones, limitaciones y fuentes. Los candidatos llevan indicadores climáticos de ambas campañas y agua declarada. | El motor valida los cuatro criterios y sus fuentes. Además comprueba si la temperatura media cae en el rango de cada cultivo; esta comprobación **no genera por sí misma el puntaje climático**. | En producción `EVALUATION_PROVIDER=None`: aparecen `engine.criteria` y `engine.priority_weights.<priority>` una vez que los demás datos están completos. |
| Puntajes, pesos y versión | `engine.scoring`: suma `score[criterio] × peso[criterio]`, redondeada a dos decimales. Versión expuesta: `motor-1.0`. | Puntajes 0–100; pesos 0–1 y suma 1. Orden descendente por puntaje; máximo tres alternativas, `selected_id` del rango 1. | Si el motor rechaza evaluaciones, respuesta `insufficient_data` sin alternativas ni puntajes. |

Las lecturas ESP32 con `quality_flag="test"` se excluyen de la evidencia agronómica. El servicio resume su presencia en `context.sensor`, pero **tampoco utiliza las demás lecturas para puntuar** (`used_as_evidence=false`). Una lectura de humedad del suelo no permite inferir pH, salinidad o nutrientes.

## Ponderaciones que solo existen en las pruebas

El fixture compartido `tests/synthetic_recommendation.py`, usado por `tests/test_rotation_engine_api.py`, define estos pesos **sintéticos** para probar el ordenamiento. No proceden de investigación agronómica y `EVALUATION_PROVIDER` de producción permanece en `None`.

| Prioridad | Clima | Agua | Suelo | Diversificación |
|---|---:|---:|---:|---:|
| `save_water` | 0,1 | 0,7 | 0,1 | 0,1 |
| `improve_soil` | 0,1 | 0,1 | 0,7 | 0,1 |

En ese mismo fixture, `clima=50` y `diversificacion=50` para todos; `agua` y `suelo` son promedios de puntuaciones arbitrarias asignadas a cada cultivo. El estado `ok` que produce el fixture sirve para verificar el programa y la forma de la respuesta, no para indicar una rotación apta para Piura.
