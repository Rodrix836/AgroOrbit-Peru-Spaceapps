# AgroOrbit Perú — Entrega agronómica para el Valle del Chira

**Caso:** Field Shift, NASA Space Apps · **Parcela representativa:** Sullana, Piura (-4.97, -80.89) · **Fecha de referencia:** 15/11/2026  
**Estado:** comparación demostrativa; **no** constituye recomendación validada para una finca.  
**Fuente de situación de la parcela:** `Ficha-parcela-Valle-del-Chira.md` del equipo (registros Supabase informados, sin nueva consulta autenticada).

## 1. Situación de partida

| Variable | Información consignada | Interpretación |
|---|---|---|
| `plot_id` | `f544f739-bc06-45c6-9cf9-052c44499ab6` | Parcela del escenario |
| `finished` | `maiz`, fechas ausentes | Cultivo anterior registrado |
| `active` | `frijol_caupi`, fechas ausentes | Cultivo actual registrado; **no** se conoce cuándo termina |
| `planned` | 2026-12-01, cultivo por elegir | Fecha tentativa de la siguiente siembra |
| Agua | `medium` | Categoría declarada, **no** cantidad de riego en mm |
| Prioridad | `improve_soil` | Preferencia del escenario, no evidencia de mejora |
| Suelo | Textura, pH y salinidad ausentes | No puede evaluarse su compatibilidad local |
| Sensor | 2 028 lecturas de humedad y 2 028 de temperatura del suelo | Todas `quality_flag=test`; no usar como evidencia |

**Diferencia crítica:** maíz → caupí refleja el **orden histórico** de estados `finished` y `active`, pero NO se conoce el calendario de esos cultivos. La referencia del cuadro siguiente es **una proyección futura hipotética** del mismo orden, no una reconstrucción histórica. Ninguno de estos escenarios asegura que el caupí activo haya concluido antes del 01/12/2026.

## 2. Tres estrategias de dos campañas

Fechas calculadas en días inclusivos, sin pausas entre campañas, usando exclusivamente las **duraciones mínimas generales del catálogo** (`crops.py`): maíz 125 días; frijol caupí 60; camote 80. El periodo comienza el **01/12/2026**, por convención del escenario; no es una fecha agronómica certificada.

| Rol | Secuencia / campaña 1 | Campaña 2 | Total | Posible ventaja a evaluar | Riesgo local que impide elegir una ganadora |
|---|---|---|---:|---|---|
| **Referencia proyectada** | **Maíz:** 01/12/2026 a 04/04/2027 (125 d) | **Caupí:** 05/04/2027 a 03/06/2027 (60 d) | **185 d** | Secuencia de cultivos distintos; estudiar diversificación y demanda hídrica de maíz | Sin datos de riego ni variedad; el mínimo de maíz puede no corresponder al cultivo real; el caupí está activo y su fin es desconocido |
| **Alternativa A** | **Caupí:** 01/12/2026 a 29/01/2027 (60 d) | **Camote:** 30/01/2027 a 19/04/2027 (80 d) | **140 d** | Comparar compatibilidad entre cultivos y requerimientos por estación, sin presuponer ahorro | Podría repetirse caupí inmediatamente tras el cultivo activo; sin registros de plagas, manejo ni fin de ciclo |
| **Alternativa B** | **Camote:** 01/12/2026 a 18/02/2027 (80 d) | **Caupí:** 19/02/2027 a 19/04/2027 (60 d) | **140 d** | Cambiar el primer cultivo proyectado respecto del caupí activo; comparar agua y manejo | No hay análisis de suelo ni disponibilidad hídrica cuantificada; selección varietal y fechas de cosecha desconocidas |

Todas las secuencias **caben aritméticamente en 365 días**. Eso no implica que sean viables por temporada, variedad, disponibilidad de agua, ventana comercial o descanso del terreno. La segunda campaña comienza al día siguiente de la primera por simplificación del motor; preparación del suelo y tiempos de transición pueden requerir días adicionales.

### Lectura comparativa sin puntuaciones

- **Agua:** no se puede declarar ahorro entre estrategias. El catálogo contiene para maíz una referencia general estacional de 500–800 mm de ETc, pero faltan necesidades comparables para caupí y camote y datos de riego, eficiencia, precipitación efectiva y agua utilizable del suelo. El valor `medium` no sirve para calcular mm/campaña. Referencia general: [FAO, necesidad de agua de los cultivos](https://www.fao.org/4/s2022e/s2022e02.htm).
- **Suelo:** incorporar una leguminosa puede ser una hipótesis de manejo a estudiar, no una promesa de mejora de fertilidad; depende de residuos, fijación efectiva, manejo y secuencia. Referencia: [FAO, sistemas y secuencias de cultivo](https://www.fao.org/4/y5146e/y5146e0a.htm).
- **Rangos generales:** EcoCrop informa pH óptimo maíz 5–7, caupí 5,5–7,5, camote 5–7. Son valores generales de la literatura y **no** mediciones de la parcela; no se incorporan automáticamente a `crops.py`. Ver las fichas [maíz](https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=238663), [caupí](https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=2153), [camote](https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=1265).

## 3. NASA POWER: datos que sí tenemos y uso correcto

La ficha informa **3 972 fechas por variable** entre 01/01/2016 y 15/11/2026, **3 969 observaciones disponibles por variable** y último valor disponible el 12/11/2026. La proporción global informada es **99,92 %** (3969/3972). **No** equivale a cobertura de una ventana de cultivo particular ni a un promedio por campaña. La fuente es NASA POWER, datos diarios en **LST** ([API diaria y estándar de tiempo](https://power.larc.nasa.gov/docs/services/api/temporal/daily/)).

| Variable | Unidad | Utilidad | Uso actual del motor |
|---|---|---|---|
| `T2M` | °C | Contexto histórico de temperatura media del aire a 2 m; comparar ventanas análogas con rangos generales, previa comprobación de cobertura | Sí, temperatura |
| `PRECTOTCORR` | mm/día | Precipitación corregida; suma histórica contextual, **no** riego ni lluvia efectiva automáticamente | Sí, precipitación |
| `GWETTOP` | fracción de saturación (1) | Humedad superficial modelada: diagnóstico auxiliar, **no** medición de pH, textura o riego | Disponible en almacenamiento; no integrada al puntaje |
| `GWETROOT` | fracción de saturación (1) | Humedad modelada de zona radicular: diagnóstico auxiliar, sin equivalencia directa con mm disponibles | Disponible en almacenamiento; no integrada al puntaje |

NASA documenta variables de humedad superficial y radicular en su [catálogo metodológico de hidrología](https://power.larc.nasa.gov/docs/methodology/data/sources_hydrology/). **No usar** las lecturas del kit ESP32 con `quality_flag=test` como evidencia: las pruebas se realizaron fuera del campo.

**Análisis pendiente por campaña:** para cada intervalo de la tabla, el adaptador busca los mismos días de calendario en hasta cinco años anteriores. Hay que auditar *cada* ventana y año análogo con `climate_window_audit.py` y consignar días esperados, observados, válidos, cobertura y posibles fechas futuras respecto del corte histórico. No disponemos aquí del detalle diario para calcular esos indicadores; **no se inventan**. Las ventanas históricas y las condiciones futuras no equivalen a pronósticos de 2027.

## 4. Matriz de interpretación agronómica

| Criterio | Dato y unidad | Regla/interpretación candidata | Respaldo y alcance | Si falta evidencia |
|---|---|---|---|---|
| **Clima** | Fechas y variedad, `T2M` (°C) diario, cobertura por ventana/año | Verificar calidad y completitud temporal antes de comparar proporción de días en rangos generales. El umbral mínimo de cobertura debe acordarse con especialistas | NASA POWER y EcoCrop/FAO GAEZ: parámetros generales, no desempeño medido en Piura | Marcar criterio como **no evaluable**, no asignar cero ni puntuar producción |
| **Agua** | ETo, Kc y ETc (mm/campaña), lluvia efectiva, riego neto, reservas de suelo (mm), eficiencia de riego | Comparar demanda y oferta solo tras asegurar unidades, modelo y periodos comparables | [FAO-56](https://www.fao.org/4/x0490e/x0490e06.htm); la precipitación bruta no equivale a oferta de riego | **No evaluable**; `medium` sigue categórico, sin inferir mm ni ahorro |
| **Suelo** | Textura, pH, ECe (dS/m y método), drenaje, fecha y profundidad | Contrastar mediciones locales con requisitos de cultivo y método equivalente. pH EcoCrop es referencia general | EcoCrop; [FAO, salinidad de suelos](https://www.fao.org/4/x5871e/x5871e04.htm) | **No evaluable**; no extrapolar de sensores de humedad |
| **Diversificación** | Secuencia, cultivos anterior/actual, fechas, variedad, familia, manejo de residuos, plagas | Comparar repetición o alternancia y explicar riesgos; efectos nutricionales exigen condiciones y manejo comprobados | [FAO, secuencias de cultivo](https://www.fao.org/4/y5146e/y5146e0a.htm), alcance general | **No evaluable cuantitativamente**; advertir continuidad desconocida del caupí |

### Reglas, scores y pesos

- **Reglas respaldadas:** unidades y significado de variables NASA, necesidad de datos comparables, rangos generales de bibliografía y exclusión de sensores de prueba.
- **Reglas metodológicas por aprobar:** cobertura mínima por campaña, conversión a `score` 0–100, tratamiento de extrema temperatura, agua y rotación en un ranking, trazabilidad de fuentes por cada regla.
- **Pesos:** los fixtures usan `save_water` = clima 0,1 / agua 0,7 / suelo 0,1 / diversificación 0,1; `improve_soil` = clima 0,1 / agua 0,1 / suelo 0,7 / diversificación 0,1. **Son sintéticos para pruebas**, no preferencias agronómicas validadas ni medición de la prioridad. No deben emplearse para declarar una estrategia ganadora.
- El motor mantiene `EVALUATION_PROVIDER = None`. En el estado conocido de la ficha la respuesta técnica esperable es **`insufficient_data`**, no `ok` con ranking.

## 5. JSON y contrato vigente

**Solicitud de referencia a `POST /api/recommendations`:**

```json
{"plot_id":"f544f739-bc06-45c6-9cf9-052c44499ab6","priority":"improve_soil","horizon_days":365}
```

El contrato actual permite `context.start_on`, `missing`, `selected_id`, `alternatives` y, si hubiera `ok`, `alternatives[].criteria` como objeto `{clima, agua, suelo, diversificacion}` con `{score, weight, contribution}` por criterio. **No** incorpora un campo estructurado que marque `rol=referencia` en las alternativas: conservar esa distinción en esta tabla, o acordar con Rodrigo una ampliación mínima *opcional*, sin modificar ahora la API.

Se adjunta **`examples/valle-chira-insufficient-data.json`**, ejemplo estático ilustrativo del estado de la ficha (no salida autenticada). Se mantienen alternativas vacías, `selected_id: null` y faltantes de textura y requisitos del catálogo. Los indicadores climáticos no calculados se dejan fuera al declarar `context.power: null` en el ejemplo: **esto no significa que no exista histórico en Supabase**; significa que no se ha generado aquí una respuesta real del servicio ni sus agregados exactos.

La muestra anterior `recommendations-post-valle-chira-real.json` corresponde a otro momento y no debe confundirse con la ficha actual. Las alternativas documentadas no son puntuaciones generadas por API.

## 6. Acciones concretas para el equipo

**Para Rodrigo — reglas técnicas:**
1. Mantener `insufficient_data` sin scores cuando falten textura o requisitos documentados; no activar `EVALUATION_PROVIDER`.
2. Acordar cobertura mínima de T2M por campaña/año y fecha de corte antes de integrar `climate_window_audit.py`.
3. Incorporar el cultivo **actual** (`active`) y el anterior (`finished`) como contexto del futuro evaluador; evitar continuidad inadvertida de caupí. Determinar si una futura etiqueta estructurada de referencia requiere cambio mínimo de contrato.
4. Versionar catálogos, reglas, pesos y fuentes; pruebas de regresión ante los cambios.

**Para Elías — información que falta de manera concreta:**
1. Confirmar fecha de siembra y terminación real del caupí `active` y del maíz `finished`; variedad y finalidad (grano, vaina, raíz) de los tres cultivos.
2. Textura, pH, ECe/salinidad y drenaje **medidos**; fecha, profundidad, laboratorio/método y unidades.
3. Riego por turno o campaña (volumen y superficie para convertir a mm), eficiencia del sistema, disponibilidad y programación; manejo y residuos/plagas.
4. Exportar filas diarias de `nasa_observation` para este `plot_id` con `observed_on`, `variable`, `value`, `unit`, `source`, fechas LST y nulos, para `T2M`, `PRECTOTCORR`, `GWETTOP`, `GWETROOT`; auditar cada ventana/año análogo. No compartir credenciales.
5. Mantener los inputs/outputs de cada recomendación, fecha de corte, versión de modelo y pesos para reproducibilidad.

**Para Luis — textos mostrables al agricultor (sin puntajes ficticios):**
- «Estas tres secuencias son opciones para comparar, no recomendaciones validadas para tu parcela.»
- «La fecha de inicio y las duraciones son supuestos del ejemplo. El cultivo de caupí actual no tiene fecha de término registrada.»
- «NASA POWER aporta información histórica de temperatura del aire y precipitación; no predice automáticamente la próxima cosecha.»
- «La disponibilidad de agua indicada como media no equivale a una cantidad de riego calculada.»
- «No se ha registrado análisis de textura, pH o salinidad. Las mediciones del kit de prueba no se usan para recomendar.»
- «Todavía faltan datos para comparar con puntuaciones confiables las alternativas.»

## 7. Alcance y conclusión

Se presentan **una referencia proyectada y dos alternativas comparables**, con duraciones aritméticas y riesgos explícitos, y una matriz de datos y reglas por criterio. No se asignan puntuaciones, ahorro, rendimiento, fertilidad ni viabilidad futura, porque faltan evidencia local y decisiones metodológicas del equipo. La entrega agronómica es útil para discusión con Rodrigo, Elías y Luis, pero **no activa** nuevas recomendaciones en producción.
