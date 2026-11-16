// Traducciones al inglés de textos que llegan en español desde los datos (ver dataText.ts): los dos archivos del
// escenario de demostración de Rodrigo (PR #23), el contenido de Milene (`src/data/lectura-milene.ts`) y las
// respuestas de ejemplo (`src/services/mocks`). Coincidencia exacta o patrón para las frases que llevan números o
// nombres de cultivo. Un texto que no esté aquí se muestra como llegó, en español.

/** Nombres de cultivo y términos sueltos que aparecen dentro de frases de datos. */
const TERMS: [RegExp, string][] = [
  [/Frijol caupí/g, 'Cowpea'],
  [/frijol caupí/g, 'cowpea'],
  [/frijol_caupi/g, 'cowpea'],
  [/Maíz/g, 'Corn'],
  [/maíz/g, 'corn'],
  [/Camote/g, 'Sweet potato'],
  [/camote/g, 'sweet potato'],
  [/franco/g, 'loam'],
]
const terms = (s: string) => TERMS.reduce((acc, [re, to]) => acc.replace(re, to), s)

export const DATA_TEXT_EN: Record<string, string> = {
  // ---- escenario de demostración: demo ----
  'Comparación de demostración. No es una recomendación validada para la parcela.':
    'Demonstration comparison. This is not a validated recommendation for the plot.',
  'Escenario de demostración. No es una recomendación validada para la parcela.':
    'Demonstration scenario. This is not a validated recommendation for the plot.',
  'Referencia proyectada': 'Projected reference',
  'Alternativa A': 'Alternative A',
  'Alternativa B': 'Alternative B',
  'Repite el orden del historial (maíz → frijol caupí) desde la próxima siembra. Es una proyección hipotética, no una reconstrucción del calendario real.':
    'Repeats the order of the history (corn → cowpea) from the next sowing. It is a hypothetical projection, not a reconstruction of the real calendar.',
  'Frijol caupí → camote. Podría repetir el frijol caupí justo después del cultivo activo.':
    'Cowpea → sweet potato. It could repeat cowpea right after the active crop.',
  'Camote → frijol caupí. Cambia el primer cultivo respecto del frijol caupí activo.':
    'Sweet potato → cowpea. It changes the first crop compared with the active cowpea.',
  'SINTÉTICAS: score, criteria (puntuación por criterio) y pesos por prioridad son de prueba, no agronómicos; textos con prefijo SYNTHETIC.':
    'SYNTHETIC: score, criteria (score per criterion) and weights per priority are test values, not agronomic; texts with the SYNTHETIC prefix.',
  'SINTÉTICOS donde el catálogo no tiene fuente (agua de frijol caupí y camote; pH, salinidad y suelos de los tres); fuente example.invalid.':
    'SYNTHETIC where the catalog has no source (water for cowpea and sweet potato; pH, salinity and soils for the three); source example.invalid.',
  'Inicio 2026-12-01 y duraciones mínimas del catálogo (maíz 125, frijol caupí 60, camote 80 días) son supuestos; se supone que el frijol caupí activo termina antes.':
    'Start 2026-12-01 and minimum catalog durations (corn 125, cowpea 60, sweet potato 80 days) are assumptions; the active cowpea is assumed to end earlier.',
  '«franco» es un supuesto: la parcela no tiene textura registrada.':
    '“loam” is an assumption: the plot has no registered texture.',
  // ---- escenario de demostración: response ----
  'Las fechas usan la duración más corta citada para cada cultivo; varía según la variedad.':
    'The dates use the shortest duration cited for each crop; it varies by variety.',
  'Textura supuesta para la demostración: la parcela aún no la tiene registrada.':
    'Texture assumed for the demonstration: the plot does not have it registered yet.',
  'Fecha de inicio del escenario de demostración, no una fecha agronómica certificada.':
    'Start date of the demonstration scenario, not a certified agronomic date.',
  'Las fechas de campaña usan la duración mínima general de cada cultivo (maíz 125 días, frijol caupí 60, camote 80), sin pausas entre campañas; varían según variedad y manejo.':
    'Campaign dates use the general minimum duration of each crop (corn 125 days, cowpea 60, sweet potato 80), with no pauses between campaigns; they vary by variety and management.',
  'Se supone que el frijol caupí activo termina antes de la siembra: no tiene fecha registrada.':
    'The active cowpea is assumed to end before sowing: it has no registered date.',
  'Los requisitos de pH, salinidad, suelos y agua de los cultivos son de prueba, sin fuente real.':
    'The pH, salinity, soil and water requirements of the crops are test values, with no real source.',
  'Las puntuaciones por criterio y los pesos por prioridad son de prueba, no agronómicos.':
    'The scores per criterion and the weights per priority are test values, not agronomic.',
  'duración mínima del catálogo': 'catalog minimum duration',
  sintético: 'synthetic',
  franco: 'loam',
  medium: 'medium',
  'Parcela demostrativa – Valle del Chira (Sullana, Piura)': 'Demonstration plot – Chira Valley (Sullana, Piura)',
  'Escenario de demostración: parte de los datos son supuestos, no medidos.':
    'Demonstration scenario: part of the data are assumptions, not measured.',
  'Las lecturas del sensor son de prueba, tomadas fuera del campo, y no se usan para el cálculo.':
    'The sensor readings are test readings, taken outside the field, and are not used for the calculation.',
  // ---- textos «SYNTHETIC …» ya sin el prefijo ----
  'Clima: puntuación de demostración, no agronómica.': 'Climate: demonstration score, not agronomic.',
  'Agua: puntuación de demostración, no agronómica.': 'Water: demonstration score, not agronomic.',
  'Suelo: puntuación de demostración, no agronómica.': 'Soil: demonstration score, not agronomic.',
  'Diversificacion: puntuación de demostración, no agronómica.': 'Diversification: demonstration score, not agronomic.',
  'Diversificación: puntuación de demostración, no agronómica.': 'Diversification: demonstration score, not agronomic.',
  // ---- contenido de Milene (src/data/lectura-milene.ts) ----
  Agua: 'Water',
  Suelo: 'Soil',
  'Rangos generales': 'General ranges',
  'No se puede declarar ahorro entre estrategias. El catálogo contiene para maíz una referencia general estacional de 500–800 mm de ETc, pero faltan necesidades comparables para caupí y camote y datos de riego, eficiencia, precipitación efectiva y agua utilizable del suelo. El valor «medium» no sirve para calcular mm por campaña.':
    'No savings can be declared between strategies. The catalog has a general seasonal reference of 500–800 mm of ETc for corn, but comparable needs for cowpea and sweet potato are missing, as are irrigation, efficiency, effective rainfall and usable soil water data. The «medium» value cannot be used to calculate mm per campaign.',
  'Incorporar una leguminosa puede ser una hipótesis de manejo a estudiar, no una promesa de mejora de fertilidad; depende de residuos, fijación efectiva, manejo y secuencia.':
    'Including a legume can be a management hypothesis to study, not a promise of better fertility; it depends on residues, effective fixation, management and sequence.',
  'EcoCrop informa pH óptimo maíz 5–7, caupí 5,5–7,5, camote 5–7. Son valores generales de la literatura y no mediciones de la parcela.':
    'EcoCrop reports optimum pH of 5–7 for corn, 5.5–7.5 for cowpea and 5–7 for sweet potato. They are general values from the literature, not measurements of the plot.',
  'FAO: necesidades de agua de los cultivos': 'FAO: crop water needs',
  'FAO: sistemas y secuencias de cultivo': 'FAO: cropping systems and sequences',
  'EcoCrop (FAO): ficha del maíz, Zea mays': 'EcoCrop (FAO): corn data sheet, Zea mays',
  'EcoCrop (FAO): ficha del frijol caupí, Vigna unguiculata': 'EcoCrop (FAO): cowpea data sheet, Vigna unguiculata',
  'EcoCrop (FAO): ficha del camote, Ipomoea batatas': 'EcoCrop (FAO): sweet potato data sheet, Ipomoea batatas',
  'La fecha de inicio y las duraciones son supuestos del ejemplo. El cultivo de caupí actual no tiene fecha de término registrada.':
    'The start date and the durations are assumptions of the example. The current cowpea crop has no registered end date.',
  'NASA POWER aporta información histórica de temperatura del aire y precipitación; no predice automáticamente la próxima cosecha.':
    'NASA POWER provides historical air temperature and precipitation information; it does not automatically predict the next harvest.',
  'La disponibilidad de agua indicada como media no equivale a una cantidad de riego calculada.':
    'Water availability indicated as medium is not the same as a calculated irrigation amount.',
  'No se ha registrado análisis de textura, pH o salinidad. Las mediciones del kit de prueba no se usan para recomendar.':
    'No texture, pH or salinity analysis has been recorded. The measurements of the test kit are not used to recommend.',
  'Todavía faltan datos para comparar con puntuaciones confiables las alternativas.':
    'Data are still missing to compare the alternatives with reliable scores.',
  // ---- respuestas de ejemplo (services/mocks) ----
  'Escenario de demostración con supuestos.': 'Demonstration scenario with assumptions.',
  '[Ejemplo] Respuesta de muestra: no proviene del motor de reglas.':
    '[Example] Sample response: it does not come from the rules engine.',
  '[Ejemplo] No se mide la mejora del suelo; es un criterio del prototipo.':
    '[Example] Soil improvement is not measured; it is a prototype criterion.',
  '[Ejemplo] No se usó información de pH, NPK ni salinidad.': '[Example] No pH, NPK or salinity information was used.',
  '[Ejemplo] Con la prioridad de mejorar el suelo, una leguminosa antes del maíz puntúa más en la sucesión.':
    '[Example] With the improve-the-soil priority, a legume before corn scores higher in the sequence.',
  '[Ejemplo] El ganador no cambió respecto a ahorrar agua: eso puede pasar cuando la evidencia no justifica un cambio.':
    '[Example] The winner did not change compared with saving water: that can happen when the evidence does not justify a change.',
  '[Ejemplo] Alternativa con el orden de cultivos invertido, para comparar.':
    '[Example] Alternative with the crop order reversed, for comparison.',
  '[Ejemplo] Primera campaña con un cultivo de ciclo corto, para priorizar menor uso de agua.':
    '[Example] First campaign with a short-cycle crop, to prioritize lower water use.',
  '[Ejemplo] La lluvia acumulada del período NASA POWER se compara con los mismos meses de años anteriores.':
    '[Example] The rain accumulated in the NASA POWER period is compared with the same months of previous years.',
  'INIA: material de caupí INIA 432 (Tumbes y Piura)': 'INIA: INIA 432 cowpea material (Tumbes and Piura)',
  'Supuesto del escenario de demostración.': 'Assumption of the demonstration scenario.',
  'Escenario de demostración: los datos marcados en assumptions son supuestos, no declarados por un agricultor. Parcela representativa, no una chacra real.':
    'Demonstration scenario: the data marked in assumptions are assumptions, not declared by a farmer. Representative plot, not a real farm.',
  'Parcela demostrativa: ubicación representativa (Valle del Chira, Sullana), no una chacra real.':
    'Demonstration plot: representative location (Chira Valley, Sullana), not a real farm.',
  '[Ejemplo] Evaluación de muestra con datos declarados de la parcela; no proviene del motor de reglas.':
    '[Example] Sample evaluation with the plot’s declared data; it does not come from the rules engine.',
  'Lecturas del ESP32 tomadas fuera del campo.': 'ESP32 readings taken outside the field.',
  'La regla de rotación necesita el cultivo anterior; la parcela aún no tiene un ciclo finished.':
    'The rotation rule needs the previous crop; the plot does not have a finished cycle yet.',
  'La regla de rotación necesita el cultivo anterior.': 'The rotation rule needs the previous crop.',
  'Necesario para estimar si el agua cubre la campaña.': 'Needed to estimate whether the water covers the campaign.',
  'Necesario para la regla de suelo.': 'Needed for the soil rule.',
  'Rangos de temperatura y agua sin fuente verificable en el catálogo.':
    'Temperature and water ranges without a verifiable source in the catalog.',
  '14 días de POWER no bastan para evaluar campañas futuras; falta un histórico.':
    '14 days of POWER are not enough to evaluate future campaigns; a history is missing.',
}

export const DATA_PATTERNS: [RegExp, (m: RegExpExecArray) => string][] = [
  [
    /^NASA POWER real \(T2M y PRECTOTCORR diarios, (.+)\)$/,
    (m) => `Real NASA POWER (daily T2M and PRECTOTCORR, ${m[1].replace(' a ', ' to ')})`,
  ],
  [
    /^(.+): la temperatura promedio está dentro del rango de referencia\.$/,
    (m) => `${terms(m[1])}: the mean temperature is within the reference range.`,
  ],
  [
    /^Clima: temperatura media de las fechas de cada campaña en años anteriores \((.+)\)\.$/,
    (m) => `Climate: mean temperature on the dates of each campaign in previous years (${terms(m[1])}).`,
  ],
  [
    /^Agua: necesidad de prueba frente al agua declarada en la parcela «(.+)»\.$/,
    (m) => `Water: test requirement against the water declared on the plot «${m[1]}».`,
  ],
  [
    /^Suelo: aporte de prueba con textura «(.+)»\.$/,
    (m) => `Soil: test contribution with «${terms(m[1])}» texture.`,
  ],
  [
    /^Diversificaci[oó]n: la primera campaña (no )?repite el cultivo actual \((.+)\)\.$/,
    (m) => `Diversification: the first campaign ${m[1] ? 'does not repeat' : 'repeats'} the current crop (${terms(m[2])}).`,
  ],
  [/^antes de (.+)$/, (m) => `before ${m[1]}`],
]
