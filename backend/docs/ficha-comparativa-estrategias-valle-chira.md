# AgroOrbit Perú — Ficha comparativa de estrategias de rotación

**Proyecto:** AgroOrbit Perú — NASA Space Apps  
**Caso:** Parcela representativa del Valle del Chira, Sullana, Piura  
**Fecha de referencia:** 15 de noviembre de 2026  
**Estado:** Comparación ilustrativa, pendiente de validación agronómica.

> Los textos de las tarjetas (sección 5) están en `demo.estrategias[]` de [`examples/demo-rotaciones-valle-chira-improve_soil.json`](examples/demo-rotaciones-valle-chira-improve_soil.json). Ver [`demo-rotaciones-valle-chira.md`](demo-rotaciones-valle-chira.md).

## 1. Contexto del escenario

Según la ficha de la parcela, el cultivo anterior registrado es maíz (`finished`) y el actual es frijol caupí (`active`). No se dispone de las fechas reales de finalización de estos cultivos.

La próxima siembra está planificada para el **1 de diciembre de 2026**, fecha que se utiliza como inicio ilustrativo de las tres estrategias.

La disponibilidad de agua registrada es `medium` y la prioridad es `improve_soil`. La textura, el pH y la salinidad del suelo aún no cuentan con mediciones registradas.

## 2. Comparación de las tres estrategias

Las fechas se calculan con días inclusivos, utilizando las duraciones mínimas generales del catálogo de cultivos. Se supone que cada segunda campaña comienza al día siguiente de terminar la primera.

| Estrategia | Campaña 1 | Campaña 2 | Duración total | Comparación cualitativa | Limitación principal |
|---|---|---|---|---|---|
| **Referencia proyectada: maíz → frijol caupí** | Maíz: 01/12/2026 al 04/04/2027 (125 días) | Caupí: 05/04/2027 al 03/06/2027 (60 días) | **185 días** | Permite comparar el calendario y los requerimientos hídricos generales del maíz frente a las alternativas. | No se conoce la fecha de término del caupí actual ni la variedad de maíz que se sembraría. |
| **Alternativa A: frijol caupí → camote** | Caupí: 01/12/2026 al 29/01/2027 (60 días) | Camote: 30/01/2027 al 19/04/2027 (80 días) | **140 días** | Permite evaluar una secuencia más corta y la posible contribución del caupí al manejo del suelo. | Debe verificarse si el caupí actual habrá terminado antes del 01/12/2026 y si resulta adecuado volver a sembrarlo inmediatamente. |
| **Alternativa B: camote → frijol caupí** | Camote: 01/12/2026 al 18/02/2027 (80 días) | Caupí: 19/02/2027 al 19/04/2027 (60 días) | **140 días** | Permite comparar el cambio de orden de los cultivos, el calendario y sus necesidades de agua. | Faltan mediciones de suelo, información de riego y datos de variedades para evaluar su viabilidad. |

**Verificación de fechas:** Las tres estrategias respetan las duraciones indicadas y no presentan días superpuestos. Las alternativas A y B duran 45 días menos que la referencia, pero esto no demuestra ahorro de agua, mayor productividad ni mejora del suelo.

La referencia proyectada reproduce hacia el futuro el orden maíz → caupí del historial registrado. Sus fechas son hipotéticas y no representan las fechas reales de los cultivos anteriores.

## 3. Fuentes y supuestos

| Estrategia | Respaldo documental y agronómico | Supuestos del escenario |
|---|---|---|
| **Referencia proyectada** | FAO, *Irrigation Water Management*, para la duración general de maíz (125–180 días) y una necesidad hídrica estacional aproximada de 500–800 mm de ETc. FAO EcoCrop para la duración general del caupí. | Inicio el 01/12/2026, duración mínima de cada cultivo y repetición futura del orden histórico. |
| **Alternativa A** | FAO EcoCrop, *Vigna unguiculata*, para el rango general de caupí (60–240 días), y *Ipomoea batatas*, para camote (80–170 días). FAO sobre secuencias de cultivos como referencia general para estudiar sus efectos. | Caupí de 60 días, camote de 80 días, transición inmediata y disponibilidad del terreno desde el 01/12/2026. |
| **Alternativa B** | Las mismas fichas FAO EcoCrop de camote y caupí respaldan los rangos generales de duración. La bibliografía sobre rotación permite plantear una comparación, pero no afirmar beneficios locales. | Camote de 80 días, caupí de 60 días, transición inmediata y condiciones adecuadas de siembra. |

**Fuentes de consulta:**

- [FAO — Necesidades de agua de los cultivos](https://www.fao.org/4/s2022e/s2022e02.htm)
- [FAO — Duración de los periodos de crecimiento](https://www.fao.org/4/s2022e/s2022e07.htm)
- [FAO EcoCrop — Frijol caupí](https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=10835)
- [FAO EcoCrop — Camote](https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=1265)
- [FAO — Sistemas y secuencias de cultivo](https://www.fao.org/4/y5146e/y5146e0a.htm)
- [FAO-56 — Evapotranspiración del cultivo](https://www.fao.org/4/x0490e/x0490e06.htm)

Estas fuentes aportan parámetros y principios generales. No demuestran por sí mismas la viabilidad ni el desempeño de las tres estrategias en la parcela del Valle del Chira.

## 4. Textura del suelo para la demostración

**Se confirma que podemos utilizar `franco` como textura supuesta**, porque el script `backend/scripts/reproducir_recomendaciones.py` ya utiliza ese valor en el caso sintético completo.

Debe mostrarse explícitamente como:

**Textura del suelo: franco (valor supuesto para demostración; pendiente de medición).**

No debe presentarse como una característica comprobada de la parcela ni guardarse como medición real.

Además, el script sintético utiliza agua `low` y prioridad `save_water`, mientras que la ficha del Valle del Chira registra `medium` e `improve_soil`. Por ello, debe reutilizarse únicamente el supuesto de textura acordado, sin confundir ambos escenarios.

## 5. Textos breves para las tarjetas de Luis

### Tarjeta 1 — Referencia proyectada

**Maíz → Frijol caupí**

185 días estimados · 01/12/2026 al 03/06/2027

«Proyección del orden de cultivos registrado en la parcela. Sirve como referencia para comparar calendario y necesidades de agua.»

**Advertencia:** Fechas ilustrativas; falta confirmar la finalización del cultivo actual y las condiciones de siembra.

### Tarjeta 2 — Alternativa A

**Frijol caupí → Camote**

140 días estimados · 01/12/2026 al 19/04/2027

«Secuencia alternativa para estudiar el manejo del suelo y comparar los requerimientos de ambos cultivos.»

**Advertencia:** Debe verificarse que el caupí actual haya terminado y que sea adecuado sembrar caupí nuevamente.

### Tarjeta 3 — Alternativa B

**Camote → Frijol caupí**

140 días estimados · 01/12/2026 al 19/04/2027

«Secuencia con un orden diferente de cultivos, útil para comparar calendario, manejo y necesidades hídricas.»

**Advertencia:** Faltan análisis del suelo y datos de riego para evaluar su viabilidad.

**Aviso común para las tres tarjetas:** «Opciones ilustrativas de comparación. No constituyen recomendaciones agronómicas validadas.»

## 6. Condiciones pendientes para validar beneficios

**Para afirmar ahorro de agua:** Se necesitan requerimientos hídricos comparables por cultivo y campaña, evapotranspiración de referencia (ETo), coeficientes de cultivo (Kc), precipitación efectiva, volumen de riego, eficiencia del sistema y condiciones locales del suelo. La categoría `medium` no equivale a una cantidad de agua en milímetros.

**Para afirmar mejora del suelo:** Se necesitan mediciones de textura, pH, salinidad y otras propiedades relevantes, además de información sobre residuos, manejo del caupí, fijación de nitrógeno y antecedentes de la parcela. Incorporar una leguminosa no garantiza por sí solo una mejora.

**Para validar el calendario:** Deben confirmarse las fechas de finalización del caupí actual, variedades, destino de cosecha, disponibilidad del terreno, periodos de preparación y compatibilidad con las condiciones climáticas locales.

NASA POWER puede aportar información histórica de temperatura y precipitación para analizar las ventanas de cultivo, pero no reemplaza las mediciones del suelo ni constituye un pronóstico de las condiciones futuras.

## 7. Conclusión

Las tres estrategias están definidas con fechas y duraciones consistentes y pueden utilizarse en una comparación cualitativa durante la demostración.

Por el momento, **no corresponde asignar una estrategia ganadora ni afirmar porcentajes de ahorro de agua, mejora del suelo o aumento de productividad**.

La comparación debe mantenerse como escenario ilustrativo hasta completar los datos de campo y validar las reglas agronómicas con el equipo.
