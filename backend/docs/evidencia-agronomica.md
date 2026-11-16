# Evidencia agronómica registrada y verificada

**Actualización 2B.1 (15/11/2026):** el inventario de la fase 2A se conserva abajo como estado histórico del catálogo. La matriz de verificación al final de esta página registra las publicaciones consultadas directamente y sustituye, para la investigación, el estado «pendiente de verificación» de las filas que sí se pudieron contrastar. Ningún valor de `app/data/crops.py` se modificó. Una fuente verificada para un valor general no demuestra por sí sola que ese valor sea óptimo para una parcela de Piura.

Inventario de `app/data/crops.py` al 15/11/2026, conservado de la fase 2A. **Una URL registrada en el código no equivale a haber verificado la publicación.** En 2A no se consultó ni contrastó el contenido de los documentos enlazados; las verificaciones posteriores están en la matriz 2B.1 de abajo. «Pendiente de verificación» describe el estado de este inventario histórico. `None` sigue siendo `None`; ninguna fila completa un requisito del motor.

Un rango óptimo de temperatura no es un límite de supervivencia. «Agua por campaña» debe conservar una definición comparable (por ejemplo ETc estacional); no debe confundirse con lluvia anual ni con riego aplicado. Los rangos generales tampoco sustituyen información varietal o local de Piura.

## Maíz (`maiz`)

| Campo exacto | Valor | Unidad | Fuente bibliográfica y URL registrada | Alcance declarado en el catálogo | Estado | Limitación para Piura |
|---|---:|---|---|---|---|---|
| `temperatura_min_c` | 20 | °C | [FAO GAEZ v4, perfil Maize][gaez-maize] | Óptimo de fotosíntesis de la especie | Pendiente de verificación | No define respuesta de variedades y fechas de siembra locales. |
| `temperatura_max_c` | 30 | °C | [FAO GAEZ v4, perfil Maize][gaez-maize] | Mismo rango óptimo | Pendiente de verificación | No es límite absoluto ni pronóstico local. |
| `agua_min_mm_campana` | 500 | mm/campaña | [FAO, *Irrigation Water Management: Irrigation Water Needs*, tabla 5][fao-water] | Necesidad hídrica estacional aproximada de maíz | Pendiente de verificación | ETc aproximada; no equivale a agua de riego disponible en una parcela de Piura. |
| `agua_max_mm_campana` | 800 | mm/campaña | [FAO, *Irrigation Water Management: Irrigation Water Needs*, tabla 5][fao-water] | Mismo intervalo estacional | Pendiente de verificación | Requiere comprobar clima, manejo y variedad locales. |
| `duration_min_days` | 125 | días | [FAO, *Irrigation Water Management: Irrigation Water Needs*, tabla 6][fao-duration] | Maíz de grano; duración indicativa | Pendiente de verificación | La fecha de cosecha depende de variedad y campaña. |
| `duration_max_days` | 180 | días | [FAO, *Irrigation Water Management: Irrigation Water Needs*, tabla 6][fao-duration] | Mismo ciclo indicativo | Pendiente de verificación | No debe tomarse como calendario garantizado en Piura. |
| `soil_ph_min` | `None` | pH, sin unidad | Sin fuente registrada | No definido | No disponible | Falta rango aplicable antes de evaluar suelo. |
| `soil_ph_max` | `None` | pH, sin unidad | Sin fuente registrada | No definido | No disponible | Falta rango aplicable antes de evaluar suelo. |
| `soil_salinity_max_ds_m` | `None` | dS/m | Sin fuente registrada | No definido | No disponible | Falta umbral con método de medición y condiciones locales. |
| `soil_texture_accepted` | `None` | categorías de textura | Sin fuente registrada | No definido | No disponible | Falta una clasificación comparable con el dato declarado por el agricultor. |

## Frijol caupí (`frijol_caupi`)

| Campo exacto | Valor | Unidad | Fuente bibliográfica y URL registrada | Alcance declarado en el catálogo | Estado | Limitación para Piura |
|---|---:|---|---|---|---|---|
| `temperatura_min_c` | 20 | °C | [FAO EcoCrop, *Vigna unguiculata* subsp. *unguiculata*][ecocrop-cowpea] | Rango óptimo general de especie | Pendiente de verificación | No identifica variedad ni campaña local. |
| `temperatura_max_c` | 35 | °C | [FAO EcoCrop, *Vigna unguiculata* subsp. *unguiculata*][ecocrop-cowpea] | Mismo rango óptimo | Pendiente de verificación | No es límite absoluto de tolerancia. |
| `agua_min_mm_campana` | `None` | mm/campaña | [Estudio de ETc de caupí en Gurgueia, Brasil][cowpea-water] | Un cultivar, sitio y campaña; el catálogo menciona 288,5 mm/ciclo | No disponible | Un solo resultado no establece mínimo general para Piura. |
| `agua_max_mm_campana` | `None` | mm/campaña | [Estudio de ETc de caupí en Gurgueia, Brasil][cowpea-water] | Mismo estudio específico | No disponible | No establece máximo general para Piura. |
| `duration_min_days` | 60 | días | [FAO EcoCrop, ficha][ecocrop-cowpea] y [perfil de cosecha][cowpea-harvest] | Rango general; el perfil distingue vainas verdes y semilla seca | Pendiente de verificación | Definir destino de cosecha y variedad antes de calendarizar. |
| `duration_max_days` | 240 | días | [FAO EcoCrop, ficha][ecocrop-cowpea] y [perfil de cosecha][cowpea-harvest] | Extremo general dependiente del destino de cosecha | Pendiente de verificación | No aplicar a todas las campañas de Piura. |
| `soil_ph_min` | `None` | pH, sin unidad | Sin fuente registrada | No definido | No disponible | Falta rango verificable. |
| `soil_ph_max` | `None` | pH, sin unidad | Sin fuente registrada | No definido | No disponible | Falta rango verificable. |
| `soil_salinity_max_ds_m` | `None` | dS/m | Sin fuente registrada | No definido | No disponible | Falta umbral y método de medición. |
| `soil_texture_accepted` | `None` | categorías de textura | Sin fuente registrada | No definido | No disponible | Falta clasificación comparable. |

El catálogo contiene además `duration_by_harvest`: vainas verdes 60–160 días y semilla seca 90–240 días, atribuidos al [perfil EcoCrop][cowpea-harvest]. El motor actual usa `duration_min_days`; no selecciona destino de cosecha.

## Camote (`camote`)

| Campo exacto | Valor | Unidad | Fuente bibliográfica y URL registrada | Alcance declarado en el catálogo | Estado | Limitación para Piura |
|---|---:|---|---|---|---|---|
| `temperatura_min_c` | 18 | °C | [FAO EcoCrop, *Ipomoea batatas*][ecocrop-sweetpotato] | Rango óptimo general de especie | Pendiente de verificación | Requiere comprobar variedad y condiciones locales. |
| `temperatura_max_c` | 28 | °C | [FAO EcoCrop, *Ipomoea batatas*][ecocrop-sweetpotato] | Mismo rango óptimo | Pendiente de verificación | No es límite absoluto. |
| `agua_min_mm_campana` | `None` | mm/campaña | [Estudio de uso de agua en Mozambique][sweetpotato-water] | Cultivar TIS 2534, estación y manejo específicos | No disponible | Los valores descritos por el catálogo no fijan mínimo general para Piura. |
| `agua_max_mm_campana` | `None` | mm/campaña | [Estudio de uso de agua en Mozambique][sweetpotato-water] | Mismo estudio específico | No disponible | No fijan máximo general para Piura. |
| `duration_min_days` | 80 | días | [FAO EcoCrop, ficha][ecocrop-sweetpotato]; referencias adicionales [FAO][sweetpotato-fao] y [CIP][sweetpotato-cip] | Rango general; las otras referencias describen otros materiales y condiciones | Pendiente de verificación | No mezclar rangos varietales en una única garantía local. |
| `duration_max_days` | 170 | días | [FAO EcoCrop, ficha][ecocrop-sweetpotato]; referencias adicionales [FAO][sweetpotato-fao] y [CIP][sweetpotato-cip] | Mismo rango general | Pendiente de verificación | La duración real depende de variedad y campaña. |
| `soil_ph_min` | `None` | pH, sin unidad | Sin fuente registrada | No definido | No disponible | Falta rango verificable. |
| `soil_ph_max` | `None` | pH, sin unidad | Sin fuente registrada | No definido | No disponible | Falta rango verificable. |
| `soil_salinity_max_ds_m` | `None` | dS/m | Sin fuente registrada | No definido | No disponible | Falta umbral y método de medición. |
| `soil_texture_accepted` | `None` | categorías de textura | Sin fuente registrada | No definido | No disponible | Falta clasificación comparable. |

[gaez-maize]: https://s3.eu-west-1.amazonaws.com/data.gaezdev.aws.fao.org/crop_profiles/GAEZ_Crop_profile_maize.pdf
[fao-water]: https://www.fao.org/4/s2022e/s2022e02.htm
[fao-duration]: https://www.fao.org/4/s2022e/s2022e07.htm
[ecocrop-cowpea]: https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=10835
[cowpea-harvest]: https://ecocrop.apps.fao.org/ecocrop/srv/en/cropView?id=10835
[cowpea-water]: https://revistas.fca.unesp.br/index.php/irriga/article/view/3363 "DOI 10.15809/irriga.2008v13n2p182-190"
[ecocrop-sweetpotato]: https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=1265
[sweetpotato-fao]: https://www.fao.org/4/t0554e/T0554E14.htm
[sweetpotato-cip]: https://cipotato.org/sweetpotato/how-sweetpotato-grows/
[sweetpotato-water]: https://www.cambridge.org/core/journals/experimental-agriculture/article/abs/effects-of-water-availability-and-vine-harvesting-frequency-on-the-productivity-of-sweet-potato-in-southern-mozambique-ii-crop-water-use/CEF3B2363F673AA412F92E54A9039027

## Matriz de verificación 2B.1

Se consultaron directamente las fichas EcoCrop, FAO, el artículo *Irriga*, el resumen de Cambridge y el manual INIA de caupí. **Excepción importante:** los folletos antiguos INIA «Vaina Blanca» e «INIA 320» se pudieron leer como texto indexado, pero la recuperación del PDF original devolvió 404 en esta sesión. Sus cifras y especialmente la unidad impresa de salinidad **requieren comprobación en una copia primaria accesible**. El [repositorio INIA de Vaina Blanca][inia-caupi-repo] y el [certificado de INIA 320][inia-camote-repo] confirman la identidad de las variedades; el [compendio INIA, pp. 208–211][inia-compendio] confirma adaptación y duración de Vaina Blanca. No se ha verificado en campo la aplicabilidad a una parcela concreta de Piura.

«Incorporar» es una **recomendación para una etapa posterior**, sujeta a revisión del equipo y a identificar el cultivo/variedad del piloto; no es una modificación efectuada. Las temperaturas y duraciones ya presentes se evalúan como «conservar». Los intervalos óptimos, absolutos, indicativos y experimentales no son equivalentes. La fuente exacta, URL y ubicación aparecen en cada celda mediante los enlaces de la tabla.

### Maíz (`maiz`)

| Campo | Valor original publicado; unidad | Fuente y ubicación exacta | Alcance y tipo | Decisión técnica y razón |
|---|---|---|---|---|
| `temperatura_min_c` | 20 °C; [EcoCrop: 18 °C][maiz-ecocrop] | [FAO GAEZ v4, p. 1, *General description*][gaez-maize]; [EcoCrop, *Ecology / Temperature*][maiz-ecocrop] | GAEZ: óptimo de fotosíntesis/crecimiento de maíz; EcoCrop: óptimo ecológico general. | **Conservar 20** como rango GAEZ, dejando explícita la diferencia de definición; no mezclarlo con el mínimo absoluto de 10 °C de EcoCrop. |
| `temperatura_max_c` | 30 °C; [EcoCrop: 33 °C][maiz-ecocrop] | [GAEZ, p. 1, *General description*][gaez-maize]; [EcoCrop, *Ecology / Temperature*][maiz-ecocrop] | Óptimos generales, con distinta definición. | **Conservar 30**; el documento GAEZ advierte estrés térmico por encima, especialmente en reproducción. No es límite de supervivencia. |
| `agua_min_mm_campana` | 500 mm/periodo de crecimiento | [FAO, *Irrigation Water Management*, cap. 2, §2.4, tabla 5][fao-water] | Necesidad hídrica estacional aproximada (ETc) para maíz en condiciones óptimas; indicativa. | **Conservar 500**; no confundir con [lluvia anual 600–1200 mm de EcoCrop][maiz-ecocrop] ni con riego a aplicar. |
| `agua_max_mm_campana` | 800 mm/periodo de crecimiento | [FAO, cap. 2, §2.4, tabla 5][fao-water] | Mismo intervalo indicativo de ETc. | **Conservar 800**; requiere clima, variedad y etapa para plan de riego local. |
| `duration_min_days` | 125 días (maíz de grano); EcoCrop: 65 días | [FAO, cap. 3, §3.2.2, tabla 6][fao-duration]; [EcoCrop, *Cultivation / Crop cycle*][maiz-ecocrop] | FAO: periodo siembra–última cosecha de maíz de grano, indicativo; EcoCrop: especie/usos amplios. | **Conservar 125** solo si `maiz` representa grano; resolver tipo y variedad del piloto. |
| `duration_max_days` | 180 días (grano); EcoCrop: 365 días | [FAO, cap. 3, §3.2.2, tabla 6][fao-duration]; [EcoCrop, *Cultivation / Crop cycle*][maiz-ecocrop] | Igual: indicativo, fuertemente dependiente de variedad y ambiente. | **Conservar 180** con la misma condición; no sustituirlo por el máximo amplio de EcoCrop. |
| `soil_ph_min` | 5 (óptimo); 4,5 absoluto | [EcoCrop, *Ecology / Soil PH*][maiz-ecocrop] | Perfil general de *Zea mays*; pH sin unidad. [INIA costa peruana][inia-maiz-costa] describe suelos frecuentemente alcalinos, sin fijar aquí un mínimo varietal. | **Incorporar 5 como óptimo general** en etapa posterior, sujeto a decisión sobre la variedad y a análisis del suelo de Piura; no usar 4,5 como óptimo. |
| `soil_ph_max` | 7 (óptimo); 8,5 absoluto | [EcoCrop, *Ecology / Soil PH*][maiz-ecocrop] | Perfil general; pH sin unidad. | **Incorporar 7 como óptimo general** tras revisión del equipo; una parcela fuera de ese rango no equivale automáticamente a cultivo imposible. |
| `soil_salinity_max_ds_m` | «low (<4 dS/m)» óptimo; «medium (4–10 dS/m)» absoluto | [EcoCrop, *Ecology / Soil salinity*][maiz-ecocrop]; [FAO, *Saline soils*, §3.1.2, tabla 10][fao-salinity] | EcoCrop da **clases**, no curva cultivo–rendimiento ni umbral máximo; FAO define clases por ECe del extracto de saturación a 25 °C. | **Mantener `None`**: no transformar `<4` en máximo tolerable; exigir método de medición y umbral/pendiente de rendimiento. |
| `soil_texture_accepted` | «medium, organic» óptimo; «heavy, medium, light» absoluto | [EcoCrop, *Ecology / Soil texture*][maiz-ecocrop] | Categorías generales; «organic» ni siquiera es una clase textural de arena/limo/arcilla. | **Mantener `None`** hasta definir taxonomía y mapa a las etiquetas libres de `plot.soil_texture`; el [INIA de costa, p. 19][inia-maiz-costa] describe suelos locales, no una lista universal aceptada. |

### Frijol caupí (`frijol_caupi`)

| Campo | Valor original publicado; unidad | Fuente y ubicación exacta | Alcance y tipo | Decisión técnica y razón |
|---|---|---|---|---|
| `temperatura_min_c` | 20 °C; INIA: 18 °C | [EcoCrop, *Ecology / Temperature*][ecocrop-cowpea]; [INIA, manual 2022, §3 *Agroecología*, p. 13][inia-caupi-manual] | Óptimo general EcoCrop frente a guía peruana principalmente de tierra firme amazónica. | **Conservar 20** por coherencia con la ficha actual; registrar desacuerdo 18–34 °C del INIA antes de extrapolar a Piura. |
| `temperatura_max_c` | 35 °C; INIA: 34 °C | [EcoCrop, *Ecology / Temperature*][ecocrop-cowpea]; [INIA, §3, p. 13][inia-caupi-manual] | Óptimos generales; no límites absolutos (EcoCrop: 10–40 °C). | **Conservar 35** con limitación varietal y fenológica. |
| `agua_min_mm_campana` | 288,5 mm ETc por ciclo; 3000/4000 m³/ha/campaña de riego localizado/gravedad en ficha INIA | [Bastos et al., *Irriga* 13(2), resumen][caupi-etc]; [INIA, *Caupí Vaina Blanca*, sección Riegos][inia-caupi-vaina] | ETc experimental de BR-17 Gurguéia, Piauí (2005) frente a **riego aplicado** para Vaina Blanca de la costa norte; magnitudes distintas. | **Mantener `None`**: ni un ETc de una variedad/sitio ni volúmenes de riego por método definen mínimo general de ETc para Piura. La lluvia EcoCrop es anual. |
| `agua_max_mm_campana` | Mismos valores puntuales; no máximo general publicado | [Bastos et al., resumen][caupi-etc]; [INIA, Riegos][inia-caupi-vaina] | Experimental y manejo varietal, respectivamente. | **Mantener `None`**; no construir un rango mezclando ETc y riego aplicado. |
| `duration_min_days` | 60 días; INIA Vaina Blanca: periodo 75–120 días | [EcoCrop, *Cultivation / Crop cycle*][ecocrop-cowpea]; [INIA, compendio, pp. 210–211][inia-compendio] | 60 es mínimo general indicativo; 75–120 es variedad adaptada a Piura. El folleto indexado desglosa 75–85 en verano. | **Conservar 60** como ficha general, pero no usarlo como cosecha cierta en Piura. |
| `duration_max_days` | 240 días; INIA Vaina Blanca: periodo 75–120 días | [EcoCrop, *Cultivation / Crop cycle*][ecocrop-cowpea]; [EcoCrop, *View crop / Growing period*][cowpea-harvest]; [INIA, compendio, pp. 210–211][inia-compendio] | EcoCrop distingue vainas 60–160 y semilla 90–180/hasta 240; INIA muestra una variedad local más acotada. El folleto indexado desglosa 105–120 en invierno. | **Conservar 240** solo como límite general de ficha; pedir destino de cosecha y variedad para calendarizar. |
| `soil_ph_min` | 5,5 óptimo; 4,3 absoluto | [EcoCrop, *Ecology / Soil PH*][ecocrop-cowpea]; [INIA, §3, p. 13][inia-caupi-manual] | EcoCrop general; INIA menciona tolerancia a acidez 5,5–6,6, no un rango óptimo nacional. | **Incorporar 5,5 como óptimo general** en etapa posterior, previa revisión varietal/local. |
| `soil_ph_max` | 7,5 óptimo; 8,8 absoluto | [EcoCrop, *Ecology / Soil PH*][ecocrop-cowpea] | Perfil general, pH sin unidad. | **Incorporar 7,5 como óptimo general** en etapa posterior; no convertir la tolerancia a acidez del manual en máximo. |
| `soil_salinity_max_ds_m` | EcoCrop: «low (<4 dS/m)» óptimo y absoluto; INIA Vaina Blanca: CE ≤2 mmhos/cm | [EcoCrop, *Ecology / Soil salinity*][ecocrop-cowpea]; [INIA, *Suelos*][inia-caupi-vaina]; [FAO, tabla 9][fao-salinity] | FAO confirma equivalencia numérica mmhos/cm ↔ dS/m, **no** equivalencia del método de muestreo ni umbral de rendimiento. La ficha INIA es varietal. | **Mantener `None`**; aclarar si la CE INIA es ECe, extracto 1:5 u otra medición antes de fijar umbral general. |
| `soil_texture_accepted` | EcoCrop: «medium» óptimo; INIA Vaina Blanca: franco-arenoso preferido | [EcoCrop, *Ecology / Soil texture*][ecocrop-cowpea]; [INIA, *Suelos*][inia-caupi-vaina]; [INIA manual, §3, p. 13][inia-caupi-manual] | Clase genérica versus recomendación varietal; el manual también habla de arenosos/francos para tierra firme. | **Mantener `None`** hasta mapear clases, drenaje y alcance; «preferido» no significa único suelo aceptado. |

### Camote (`camote`)

| Campo | Valor original publicado; unidad | Fuente y ubicación exacta | Alcance y tipo | Decisión técnica y razón |
|---|---|---|---|---|
| `temperatura_min_c` | 18 °C; otra guía FAO: 20 °C | [EcoCrop, *Ecology / Temperature*][ecocrop-sweetpotato]; [FAO, *Cultivation…*, sección Temperature][sweetpotato-fao] | EcoCrop óptimo general 18–28; FAO describe óptimo 20–25 y diferencias día/noche. | **Conservar 18** como definición EcoCrop, sin ocultar desacuerdo ni inferir respuesta fenológica con una sola media. |
| `temperatura_max_c` | 28 °C; otra guía FAO: 25 °C | [EcoCrop, *Ecology / Temperature*][ecocrop-sweetpotato]; [FAO, Temperature][sweetpotato-fao] | Mismo alcance; EcoCrop absoluto 10–38 °C. | **Conservar 28**; no es límite absoluto. |
| `agua_min_mm_campana` | 800/550 mm de uso real bien regado en estación lluviosa/seca; 360/180 mm en secano | [Gomes y Carr, *Experimental Agriculture* 39(1), resumen][sweetpotato-water] | Cv. TIS 2534, sur de Mozambique, dos estaciones y manejos; resultado experimental, no rango óptimo general. [EcoCrop][ecocrop-sweetpotato] da lluvia **anual** 750–2000 mm. | **Mantener `None`**; no tomar 180 como necesidad mínima ni mezclar estaciones/riego. |
| `agua_max_mm_campana` | Mismos cuatro consumos experimentales; no máximo general | [Gomes y Carr, resumen][sweetpotato-water] | Variedad, suelo y temporada específicos. | **Mantener `None`**; no llamar 800 un límite máximo del cultivo en Piura. |
| `duration_min_days` | 80 días; INIA 320: 4–4,5 meses | [EcoCrop, *Cultivation / Crop cycle*][ecocrop-sweetpotato]; [INIA 320, *Periodo vegetativo*][inia-camote-320]; [CIP, *How Sweetpotato Grows*][sweetpotato-cip] | EcoCrop general; INIA 320, variedad adaptada a valles costeros; CIP informa promedio ~4 meses y variedades tempranas ~2. | **Conservar 80** como mínimo general indicativo, no duración garantizada de INIA 320. |
| `duration_max_days` | 170 días; INIA 320: 4–4,5 meses | [EcoCrop, *Cultivation / Crop cycle*][ecocrop-sweetpotato]; [INIA 320][inia-camote-320]; [FAO, *Physiology*][sweetpotato-fao] | FAO describe ciclo usual 100–150 días, dependiente de condiciones. | **Conservar 170** como máximo general de EcoCrop; elegir variedad y cosecha real para Piura. |
| `soil_ph_min` | 5 óptimo; 4 absoluto; FAO: 5,5 óptimo | [EcoCrop, *Ecology / Soil PH*][ecocrop-sweetpotato]; [FAO, *Soil*][sweetpotato-fao] | Perfil general, definiciones óptimas de amplitud diferente. | **Incorporar 5 como óptimo general** en etapa posterior; documentar la referencia más estrecha de FAO. |
| `soil_ph_max` | 7 óptimo; 8,7 absoluto; FAO: 6,5 óptimo; INIA 320: <8 | [EcoCrop, *Ecology / Soil PH*][ecocrop-sweetpotato]; [FAO, *Soil*][sweetpotato-fao]; [INIA 320, *Suelo*][inia-camote-320] | INIA 320 es varietal y expresa un techo, no rango óptimo. | **Incorporar 7 como óptimo general** en etapa posterior; no equiparar techo de cultivo con óptimo. |
| `soil_salinity_max_ds_m` | EcoCrop: «low (<4 dS/m)» óptimo/absoluto; extracción indexada del folleto INIA 320: «<6 mmhos/cm²», **lectura por confirmar** | [EcoCrop, *Ecology / Soil salinity*][ecocrop-sweetpotato]; [INIA 320, *Suelo* (PDF no recuperable)][inia-camote-320] | EcoCrop da clase; la unidad extraída del folleto es dimensionalmente ambigua y no se pudo verificar visualmente. No se confirma método ni curva de rendimiento. | **Mantener `None`**; no corregir por suposición la unidad ni convertir clase en máximo tolerable. |
| `soil_texture_accepted` | EcoCrop: celda vacía; INIA 320: franco-arenoso preferido | [EcoCrop, *Ecology / Soil texture*][ecocrop-sweetpotato]; [INIA 320, *Suelo*][inia-camote-320] | Ausencia de dato general; preferencia de una variedad adaptada a costa peruana. | **Mantener `None`** para la especie; podría crearse una ficha varietal separada, previa decisión del equipo. |

### Decisión resumida para el catálogo

- **Podrían incorporarse después de revisión del equipo:** `soil_ph_min` y `soil_ph_max` de `maiz` (5–7), `frijol_caupi` (5,5–7,5) y `camote` (5–7), **etiquetados como óptimos generales de EcoCrop**. Son seis campos concretos, no umbrales de imposibilidad ni valores locales medidos. Se recomienda contrastarlos con la variedad elegida y con un análisis de suelo de Piura antes de usarlos para puntuar.
- **Deben seguir en `None` ahora:** `agua_min_mm_campana` y `agua_max_mm_campana` de caupí y camote; `soil_salinity_max_ds_m` y `soil_texture_accepted` de los tres cultivos. Los valores ya presentes de temperatura, agua de maíz y duración tienen respaldo en las secciones citadas, con las limitaciones anotadas.
- La ficha [INIA Vaina Blanca][inia-caupi-vaina] es particularmente útil para Piura: documenta variedad, estaciones, textura y **riego aplicado**, pero no completa un rango general de ETc. La ficha [INIA 320][inia-camote-320] también refiere a valles de la costa norte y a una variedad específica. El [manual INIA de maíz para la costa, p. 19–20][inia-maiz-costa] señala alcalinidad y salinización en zonas bajas, lo que refuerza la necesidad de medir la parcela antes de puntuar suelo.

[maiz-ecocrop]: https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=238663
[inia-caupi-vaina]: https://www.inia.gob.pe/wp-content/uploads/investigacion/programa/sistProductivo/variedad/frijol/Caupi-vaina-blanca.pdf
[inia-caupi-manual]: https://repositorio.inia.gob.pe/server/api/core/bitstreams/f79bb96a-2a0a-49c1-a409-d767c6acef7f/content
[caupi-etc]: https://revistas.fca.unesp.br/index.php/irriga/article/view/3363
[inia-camote-320]: https://www.inia.gob.pe/wp-content/uploads/investigacion/programa/sistProductivo/variedad/camote/INIA_320.pdf
[inia-maiz-costa]: https://repositorio.inia.gob.pe/server/api/core/bitstreams/d32f9407-9bb5-4d69-9314-e879d82a9570/content
[fao-salinity]: https://www.fao.org/4/x5871e/x5871e04.htm
[inia-caupi-repo]: https://repositorio.inia.gob.pe/items/94004a36-01af-4d79-8249-5518ded48b91
[inia-camote-repo]: https://repositorio.inia.gob.pe/items/ad9701a3-d24c-490e-b641-e76221b53c48
[inia-compendio]: https://repositorio.inia.gob.pe/server/api/core/bitstreams/00d5f440-ebef-4b68-a70a-d240ac46bc1f/content
