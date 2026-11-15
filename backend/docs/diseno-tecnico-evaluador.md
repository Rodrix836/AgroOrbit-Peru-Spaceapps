# Diseño técnico del evaluador agronómico — fase 2B.2

**Estado:** preparación técnica, sin evaluador agronómico activo. `EVALUATION_PROVIDER = None`; el contrato API, `crops.py`, los pesos de producción y `motor-1.0` no cambian. Los casos `ok` de pruebas y los JSON de 2A usan datos sintéticos. Las cifras agronómicas y sus límites están en [evidencia-agronomica.md](evidencia-agronomica.md); las fórmulas candidatas están en [propuesta-evaluador-agronomico.md](propuesta-evaluador-agronomico.md).

## Arquitectura que se reutiliza

1. `recommendation_service.recommend` busca parcela e historial, comprueba entradas mínimas y conserva `insufficient_data` con `missing` si falta alguna. Las lecturas ESP32, incluidas `quality_flag=test`, no se usan como evidencia de puntuación.
2. `rotation_engine.crop_requirement_gaps` exige diez campos con valor y una URL de fuente por cultivo. `_candidates` arma pares ordenados de dos cultivos distintos y sus ventanas análogas; `window_indicators` obtiene medias/sumas de NASA POWER. `EVALUATION_PROVIDER(plot, request, candidates)` es el único punto previsto para entregar evaluaciones y pesos. Sigue en `None`.
3. `engine.recommendation.motor` valida dos campañas, duración, evaluaciones `{score, reasons, limitations, sources}`, modo y fuentes; `engine.scoring` valida cuatro puntajes 0–100, cuatro pesos 0–1 cuya suma es 1, calcula la suma ponderada y ordena. `engine.rotation` valida estructura y orden, pero no reglas agronómicas entre cultivos. `crop_evaluation.evaluar_temperatura` compara una media con un rango; no genera un puntaje climático.

Una URL bien formada es **procedencia declarada**, no verificación del contenido científico. El proveedor futuro tendrá que registrar exactamente la fuente, versión y regla aplicada. No se creará otro motor de ranking.

## Validación climática de ventanas

`recommendation_service` exige hoy **365 días con T2M distinto de `None` en todo el historial**. Es un criterio operativo provisional heredado, no un umbral agronómico demostrado. `_candidates` acepta una ventana análoga si su media de temperatura no es `None`; **un solo día** puede producirla. Ni el criterio global ni la media prueban cobertura de cada campaña o validez de precipitación. El servicio filtra observaciones anteriores a `start_on`, pero una fecha de siembra muy futura todavía podría dejar entrar observaciones posteriores a la fecha actual.

### Preparación implementada, no conectada a producción

`app/services/climate_window_audit.py` ofrece `audit_climate_windows(climate_days, starts_on, ends_on, as_of=..., years_back=5)`. Repite las ventanas en años anteriores, toma `as_of` como primer día **no histórico** y devuelve, por ventana: días esperados, días anteriores a `as_of`, días futuros, fechas observadas, días válidos de T2M y precipitación, días inválidos y estado. También cuenta fechas malformadas y registros futuros excluidos. Rechaza NaN, infinito, temperatura booleana, precipitación negativa y fechas duplicadas como datos válidos; una precipitación `None` se cuenta como **faltante**, no como valor malformado.

| Estado diagnóstico | Significado, sin umbral inventado |
|---|---|
| `completo` | Todos los días esperados son históricos y tienen T2M y precipitación válidos. Esto indica integridad de la ventana, no demuestra suficiencia agronómica. |
| `incompleto` | Hay al menos una fecha observada, pero faltan días o variables; también se usa si parte de la ventana es futura. |
| `sin_datos` | Ninguna fecha observada en la parte histórica de la ventana. |
| `datos_invalidos` | Alguna fecha observada tiene valores inválidos o registros duplicados; los conteos permiten distinguir además las ausencias. |
| `solo_futuro` | La ventana equivalente todavía no ha transcurrido en `as_of`; no se toma como observación histórica. |

Esta auditoría **no cambia `window_indicators`, `_candidates`, `MIN_HISTORY_DAYS` ni la respuesta API**. El ensayo unitario que muestra una ventana aceptada con un único T2M válido es deliberado: registra el comportamiento que falta revisar. Antes de conectar el diagnóstico, Rodrigo debe decidir la cobertura mínima por campaña y año, si se exige precipitación para clima o solo para agua, cómo tratar años atípicos y qué fecha de corte se usa para NASA POWER en LST. El umbral sería una **decisión metodológica provisional**; se deben probar sensibilidad y falsos bloqueos con series reales. La regla de integridad propuesta es excluir todo registro con `observed_on >= as_of` de la parte histórica, usando un `as_of` explícito y guardado para reproducción. La documentación de [NASA POWER sobre procesamiento diario][nasa-processing] y [validación de datos][nasa-quality] justifica revisar temporalidad y faltantes; no prescribe un porcentaje mínimo para este proyecto.

## Interfaz futura por criterio

La salida técnica propuesta conserva exactamente las claves esperadas por el motor:

```python
{
    "mode": "evaluacion",  # solo tras validación agronómica
    "assumptions": [],
    "priority_weights": {"save_water": {"clima": ..., "agua": ..., "suelo": ..., "diversificacion": ...}},
    "evaluations": {
        candidate_id: {
            "clima": {"score": ..., "reasons": [...], "limitations": [...], "sources": [...]},
            "agua": {"score": ..., "reasons": [...], "limitations": [...], "sources": [...]},
            "suelo": {"score": ..., "reasons": [...], "limitations": [...], "sources": [...]},
            "diversificacion": {"score": ..., "reasons": [...], "limitations": [...], "sources": [...]},
        }
    },
}
```

Los `...` son marcadores de diseño, **no valores para ejecutar**. Cada `score` debe ser un número 0–100 respaldado por una regla versionada y por las entradas utilizadas. `sources` debe citar la evidencia pertinente a esa regla; `reasons` explica el resultado y `limitations` sus límites. No basta citar un óptimo de cultivo para validar una fórmula de puntuación. Si una regla esencial carece de entradas o fuentes, el proveedor no debe devolver un puntaje; debe bloquear la evaluación. Hay que definir antes de integrarlo cómo convertirá esos faltantes al `missing` existente sin alterar el contrato.

| Criterio | Entradas necesarias y validaciones pendientes | Qué se puede afirmar hoy |
|---|---|---|
| Clima | Fecha y duración de ambas campañas; ventanas históricas con cobertura acordada; T2M válido, fuente, unidad y LST; rango de cada cultivo, variedad y etapa. Comparar media o fracción de días requiere una regla aprobada. | `crop_evaluation` solo determina si una **media** cae dentro de un rango; no mide rendimiento ni genera 0–100. |
| Agua | Separar ETo diario (método, humedad, radiación, viento y temperatura), Kc por etapa, ETc de campaña, precipitación total, precipitación **efectiva** y su método, agua inicial del suelo, riego disponible neto, calendario/eficiencia y duración. Validar mm/día frente a mm/campaña y procedencia de cada magnitud. | [FAO 56][fao-eto] respalda ETo y [FAO 56][fao-etc] el uso de Kc; `water_availability=low/medium/high` es una categoría declarada, no milímetros. Con T2M y lluvia bruta solos no se calcula balance hídrico fiable. |
| Suelo | Medición real de pH, fecha/profundidad/laboratorio; CE con unidad **y método** (ECe de extracto de saturación, CE de agua u otro); textura con taxonomía comparable, drenaje y requisitos documentados para cultivo/variedad. Validar que dato medido y requisito usan magnitudes compatibles. | El catálogo carece de salinidad/textura aceptada para los tres cultivos y pH todavía está en `None`; [FAO][fao-salinity] advierte que clases de salinidad y tolerancia no son un único corte universal. ESP32 no mide pH, salinidad ni nutrientes. |
| Diversificación | Código, estado y fecha del cultivo anterior, primera y segunda campaña propuestas, familia, destino de cosecha, residuos, fertilización, plagas y manejo. Validar secuencia y procedencia del historial antes de aplicar reglas. | `_candidates` impide repetir cultivo entre sus dos propuestas, pero no compara la primera con el cultivo anterior. [FAO][fao-rotation] describe efectos dependientes de la secuencia y del manejo; una leguminosa no recibe por sí sola un beneficio cuantificado. |

Las fórmulas A–D de la [propuesta](propuesta-evaluador-agronomico.md#reglas-por-criterio) son **candidatas metodológicas**, no funciones implementadas. Tampoco se implementó una conversión de `low` a agua en mm ni un puntaje por presencia de leguminosas.

## Bloqueos y compatibilidad

- **Activos:** faltantes de fecha, cultivo anterior, agua declarada, textura, requisitos de dos cultivos, 365 T2M globales y ausencia de `EVALUATION_PROVIDER` conducen a `insufficient_data`. El motor rechaza fuentes ausentes, evaluaciones incompletas y pesos inválidos cuando se lo invoca con contextos de prueba. Las lecturas `test` no se usan en puntuaciones.
- **Pendientes antes de activar:** bloquear ventanas sin cobertura aprobada o con datos inválidos/futuros; bloquear agua sin ETc comparable, precipitación efectiva y riego cuantificado; bloquear suelo sin mediciones comparables; bloquear diversificación sin regla e historial suficientes; exigir procedencia de la regla de cada puntaje y pesos revisados. Un dato faltante nunca debe convertirse silenciosamente en `score=0`.
- **Compatibilidad:** conectar estas validaciones alteraría qué candidatos llegan al proveedor y posiblemente el conjunto de `missing`; requiere pruebas de regresión de Rodrigo, actualización explícita de versión del motor y revisión del contrato antes de hacer el cambio. El módulo de auditoría actual no altera ninguno de esos recorridos.

## Pruebas y límites de lo probado

`tests/test_climate_window_audit.py` cubre ventanas completas, incompletas, vacías, fechas futuras, registros malformados, duplicados, valores climáticos inválidos y ausencia de indicador térmico. También fija el comportamiento vigente de `window_indicators` con un solo día válido para que una futura regla de cobertura muestre explícitamente el cambio. Las pruebas existentes de `test_recommendations_api.py` y `test_rotation_engine_api.py` cubren faltantes de suelo declarado, agua declarada y requisitos de cultivos, el bloqueo sin proveedor, sensores `test` y el caso sintético `ok`. `test_recommendation_engine.py` cubre evaluaciones sin fuentes; `test_reproduccion_recomendaciones.py` comprueba los dos JSON reproducibles.

**Límite:** estas pruebas no validan que `low` sea suficiente para un cultivo, que un pH/CE medido sea compatible, ni que los puntajes sintéticos reflejen agronomía real. Esos ensayos requieren primero reglas, entradas y fuentes aprobadas; crearlos ahora produciría una apariencia engañosa de validación.

## Ponderaciones y datos reproducibles

Los pesos 0,1/0,7/0,1/0,1 y 0,1/0,1/0,7/0,1 permanecen en **pruebas sintéticas**. Para producir pesos reales: definir criterios y escalas con agricultores y agrónomos de Piura, obtener comparaciones por pares para cada prioridad, calcular pesos, revisar coherencia y sensibilidad del ranking, documentar desacuerdos y aprobar una versión. El [AHP de Saaty][ahp] ofrece un método para organizar juicios; no aporta pesos válidos automáticamente para AgroOrbit.

**Rodrigo debe revisar:** corte temporal `as_of`, cobertura por ventana/año, efecto sobre candidatos y `missing`, método para pasar el cultivo anterior al proveedor y pruebas de regresión antes de cualquier conexión. **Elías deberá conservar:** entradas diarias NASA y unidad/LST, `as_of`, métricas de cobertura de ambas campañas y años análogos, mediciones de suelo y riego con método/fecha/fuente, cultivo anterior y manejo, versión del catálogo y reglas, evaluaciones por criterio, pesos y su procedencia, y la respuesta emitida. Ver [formato de persistencia](formato-persistencia-recomendaciones.md).

[nasa-processing]: https://power.larc.nasa.gov/docs/methodology/data/processing/
[nasa-quality]: https://power.larc.nasa.gov/docs/services/api/validate/
[fao-eto]: https://www.fao.org/4/x0490e/x0490e06.htm
[fao-etc]: https://www.fao.org/4/x0490e/x0490e0a.htm
[fao-salinity]: https://www.fao.org/4/x5871e/x5871e04.htm
[fao-rotation]: https://www.fao.org/4/y5146e/y5146e0a.htm
[ahp]: https://www.yorku.ca/gisweb/eats4400/AHP.pdf
