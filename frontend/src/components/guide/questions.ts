// Preguntas y respuestas de la «Guía de AgroOrbit».
//
// La guía NO usa ningún modelo de IA ni llama a servicios externos: cada respuesta es una función que arma el texto con
// reglas y con los datos que la app ya tiene cargados (`GuideData`). Si un dato no está cargado, la respuesta lo dice;
// nunca se rellena con valores de ejemplo. No da consejos de siembra, riego ni rendimiento, y no declara ganadora a
// ninguna estrategia.
//
// Para ampliarla: añade un objeto a `GUIDE_QUESTIONS` con su pantalla (`route`), el texto de la pregunta y una función
// `answer(data)` que devuelva párrafos, la fuente y, si aplica, un enlace. Si la respuesta necesita un dato que todavía
// no llega, publícalo desde la pantalla con `usePublishGuide` (ver `data.tsx`) y añade su tipo a `GuideData`.
import type { ClimateHistory } from '../../hooks/useClimateHistory'
import type { NasaProblem, NasaView } from '../../hooks/useNasa'
import type {
  Crop,
  CropCyclesResponse,
  NasaObservation,
  Plot,
  RecommendationResponse,
  SensorReading,
  SensorType,
} from '../../types/api'
import type { ScenarioModel } from '../../types/scenario'
import { formatDateTime, formatDay, formatFixed, formatAgo, formatNumber, isStale, SENSOR_STALE_MINUTES } from '../../utils/format'
import { monthlyHistory } from '../../utils/climateRisk'
import { daysBetween, todayLima } from '../../utils/period'
import { sameSpanNote, type Tradeoffs } from '../../utils/tradeoffs'
import { cropName, fieldGroup, fieldLabel } from '../rotations/labels'

/** Pantallas con preguntas. */
export type GuideRoute = 'parcela' | 'panel' | 'rotaciones'

/** Pantalla activa a partir de la ruta; null si no hay preguntas para ella. */
export function routeOf(pathname: string): GuideRoute | null {
  if (pathname.startsWith('/parcela')) return 'parcela'
  if (pathname.startsWith('/panel')) return 'panel'
  if (pathname.startsWith('/rotaciones')) return 'rotaciones'
  return null
}

/** Datos que cada pantalla publica para la guía. `undefined` = esa pantalla no está abierta o todavía no los publicó. */
export interface PageData {
  readings?: { data: SensorReading[] | null; loading: boolean; error: string | null }
  nasa?: {
    data: NasaObservation[] | null
    view: NasaView | null
    loading: boolean
    error: string | null
    problem: NasaProblem | null
  }
  history?: { data: ClimateHistory | null; loading: boolean; error: string | null }
  recommendation?: { data: RecommendationResponse | null; loading: boolean; error: string | null }
  demo?: { scenario: ScenarioModel; tradeoffs: Tradeoffs | null }
}

/** Todo lo que puede usar una respuesta: la parcela (siempre disponible en la app), lo publicado por la pantalla y la hora. */
export interface GuideData extends PageData {
  plot: Plot | null
  crops: Crop[]
  cycles: CropCyclesResponse | null
  /** Hora actual (ms), para «hace X min». */
  now: number
}

export type GuideBlock = { kind: 'p'; text: string } | { kind: 'ul'; items: string[] }

export interface GuideAnswer {
  blocks: GuideBlock[]
  /** «Fuente: …» (sin el prefijo). */
  source: string
  link?: { to: string; label: string }
}

export interface GuideQuestion {
  id: string
  route: GuideRoute
  text: string
  answer: (d: GuideData) => GuideAnswer
}

const p = (text: string): GuideBlock => ({ kind: 'p', text })
const ul = (items: string[]): GuideBlock => ({ kind: 'ul', items })

const SRC_API = 'respuesta de la API'
const SRC_SENSOR = 'sensor ESP32'
const SRC_SENSOR_TEST = 'sensor ESP32, dato de prueba'
const SRC_NASA = 'NASA POWER'
const SRC_NASA_CALC = 'NASA POWER (cálculo del frontend)'
const SRC_DEMO = 'escenario de demostración (datos de prueba)'

// ---------------------------------------------------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------------------------------------------------

/** Última lectura con valor de un tipo de sensor. */
function latestOf(readings: SensorReading[], type: SensorType): SensorReading | null {
  let last: SensorReading | null = null
  for (const r of readings) {
    if (r.sensor_type === type && r.calibrated_value !== null) {
      if (!last || r.recorded_at >= last.recorded_at) last = r
    }
  }
  return last
}

/** Última lectura de cualquier tipo (por recorded_at). */
function latestAny(readings: SensorReading[]): SensorReading | null {
  let last: SensorReading | null = null
  for (const r of readings) if (!last || r.recorded_at >= last.recorded_at) last = r
  return last
}

const isUiPriority = (v: string | null | undefined) => v === 'save_water' || v === 'improve_soil'

/** Frase corta cuando una pantalla todavía no cargó algo: error, cargando o simplemente no cargado. */
function notLoaded(
  what: string,
  gender: 'm' | 'f' | 'mp' | 'fp',
  loading: boolean | undefined,
  error: string | null | undefined,
): string {
  if (error) return `No se pudo cargar ${what}: ${error}`
  if (loading) return `Todavía se está cargando ${what}.`
  const form = { m: 'cargado', f: 'cargada', mp: 'cargados', fp: 'cargadas' }[gender]
  const verb = gender.endsWith('p') ? 'están' : 'está'
  const cap = what.charAt(0).toUpperCase() + what.slice(1)
  return `${cap} todavía no ${verb} ${form}.`
}

/** Un dato de la respuesta de NASA POWER: promedio o suma de los días con dato dentro del rango. */
function nasaSummary(obs: NasaObservation[], view: NasaView) {
  const days = daysBetween(view.from, view.to)
  const stat = (variable: string) => {
    const vals = obs.filter((o) => o.variable === variable && typeof o.value === 'number').map((o) => o.value as number)
    return { n: vals.length, sum: vals.reduce((a, b) => a + b, 0) }
  }
  const t = stat('T2M')
  const r = stat('PRECTOTCORR')
  return { days, t, r }
}

// ---------------------------------------------------------------------------------------------------------------------
// 01 Parcela
// ---------------------------------------------------------------------------------------------------------------------

function answerPlotMissing(d: GuideData): GuideAnswer {
  const { plot, cycles, crops, recommendation } = d
  if (!plot) {
    return {
      blocks: [
        p('Todavía no hay una parcela registrada. Para empezar hacen falta el nombre y las coordenadas (latitud y longitud) de tu parcela.'),
      ],
      source: SRC_API,
    }
  }
  const missing: string[] = []
  if (plot.water_availability === null) missing.push('Disponibilidad de agua: sin indicar.')
  if (!isUiPriority(plot.priority)) missing.push('Prioridad: sin elegir (ahorrar agua o mejorar el suelo).')
  if (cycles) {
    if (!cycles.previous) missing.push('Cultivo anterior: sin registrar.')
    if (!cycles.current) missing.push('Cultivo actual: sin registrar.')
    if (!cycles.planned?.sowing_date) missing.push('Inicio previsto de la siguiente campaña: sin fecha.')
  }
  const blocks: GuideBlock[] = []
  if (!cycles) {
    blocks.push(p('Los cultivos y las fechas de tu parcela todavía no se cargaron, así que no puedo decir cuáles faltan.'))
  }
  if (missing.length > 0) {
    blocks.push(p(`En «${plot.name}» faltan estos datos de esta pantalla:`), ul(missing))
  } else if (cycles) {
    blocks.push(p(`En «${plot.name}» ya están completos los datos que pide esta pantalla (agua, prioridad, cultivos y fecha de inicio).`))
  }
  // Lo que pidió la API en la última evaluación (si ya se cargó en Rotaciones).
  const rec = recommendation?.data
  if (rec && rec.status === 'insufficient_data') {
    const own = rec.missing.filter((m) => fieldGroup(m.field) === 'plot')
    if (own.length > 0) {
      blocks.push(
        p('La última evaluación de la API también indicó que falta:'),
        ul(own.map((m) => `${fieldLabel(m.field, crops)}. ${m.reason}`)),
      )
    }
  } else if (!rec) {
    blocks.push(p('Para ver qué más pide la API, abre 03 Rotaciones: allí aparece la lista de datos que faltan.'))
  }
  return { blocks, source: `${SRC_API} (datos de tu parcela)`, link: { to: '/rotaciones', label: 'Ver qué falta en Rotaciones' } }
}

function answerNextCampaign(d: GuideData): GuideAnswer {
  const date = d.cycles?.planned?.sowing_date ?? null
  const blocks: GuideBlock[] = [
    p(
      'La fecha de inicio de la siguiente campaña es el día desde el que la API cuenta las dos campañas de cada alternativa. ' +
        'De ella salen las fechas de cada campaña y los calendarios que ves en Rotaciones.',
    ),
  ]
  if (!d.plot) blocks.push(p('Todavía no hay una parcela registrada.'))
  else if (!d.cycles) blocks.push(p('La fecha de tu parcela todavía no se cargó.'))
  else if (date) blocks.push(p(`En tu parcela está guardada la fecha ${formatDay(date)}.`))
  else {
    blocks.push(
      p(
        'Tu parcela todavía no tiene esa fecha. Sin ella, los calendarios usan una fecha supuesta, y la pantalla de Rotaciones la marca como supuesto.',
      ),
    )
  }
  return { blocks, source: SRC_API, link: { to: '/rotaciones', label: 'Ir a Rotaciones' } }
}

// ---------------------------------------------------------------------------------------------------------------------
// 02 Diagnóstico
// ---------------------------------------------------------------------------------------------------------------------

function answerSensorVsNasa(d: GuideData): GuideAnswer {
  const blocks: GuideBlock[] = [
    p('El sensor ESP32 mide un solo punto de tu parcela: humedad del suelo (%) y temperatura del suelo (°C).'),
    p(
      'NASA POWER da el contexto de la zona (una celda de unos 50 km): temperatura del aire, lluvia y humedad del suelo estimada por satélite. ' +
        'No es una medición sobre tu parcela. Las dos cosas se muestran siempre por separado.',
    ),
  ]
  let usedTest = false
  const rd = d.readings
  if (rd?.data) {
    const m = latestOf(rd.data, 'soil_moisture')
    const t = latestOf(rd.data, 'soil_temperature')
    const lines: string[] = []
    if (m) lines.push(`Humedad del suelo: ${formatNumber(m.calibrated_value as number, 1)} ${m.unit || '%'} (${formatDateTime(m.recorded_at)}).`)
    if (t) lines.push(`Temperatura del suelo: ${formatNumber(t.calibrated_value as number, 1)} ${t.unit || '°C'} (${formatDateTime(t.recorded_at)}).`)
    usedTest = [m, t].some((r) => r?.quality_flag === 'test')
    if (lines.length > 0) blocks.push(p('Sensor ESP32, última lectura cargada:'), ul(lines))
    else blocks.push(p('El sensor todavía no tiene lecturas con valor cargadas.'))
  } else {
    blocks.push(p(notLoaded('las lecturas del sensor', 'fp', rd?.loading, rd?.error)))
  }
  const ns = d.nasa
  if (ns?.data && ns.view) {
    const s = nasaSummary(ns.data, ns.view)
    const lines: string[] = []
    if (s.t.n > 0) lines.push(`Temperatura promedio del aire: ${formatNumber(s.t.sum / s.t.n, 1)} °C (${s.t.n} de ${s.days} días con dato).`)
    if (s.r.n > 0) lines.push(`Lluvia total: ${formatNumber(s.r.sum, 1)} mm (${s.r.n} de ${s.days} días con dato).`)
    if (lines.length > 0) {
      blocks.push(p(`NASA POWER, del ${formatDay(ns.view.from)} al ${formatDay(ns.view.to)}:`), ul(lines))
    } else blocks.push(p('NASA POWER no trae días con dato de temperatura ni de lluvia en el período cargado.'))
  } else {
    blocks.push(p(notLoaded('el clima de NASA POWER', 'm', ns?.loading, ns?.error)))
  }
  return { blocks, source: `${usedTest ? SRC_SENSOR_TEST : SRC_SENSOR} y ${SRC_NASA}` }
}

function answerTestData(d: GuideData): GuideAnswer {
  const rd = d.readings
  if (!rd?.data) {
    return { blocks: [p(`No puedo decir si las lecturas son de prueba. ${notLoaded('las lecturas del sensor', 'fp', rd?.loading, rd?.error)}`)], source: SRC_SENSOR }
  }
  const last = latestAny(rd.data)
  if (!last) return { blocks: [p('El sensor todavía no tiene lecturas cargadas, así que no hay nada que marcar como de prueba.')], source: SRC_SENSOR }
  if (last.quality_flag === 'test') {
    const used = d.recommendation?.data?.context?.sensor
    return {
      blocks: [
        p(
          'La API marca como «dato de prueba» las lecturas de un kit de prueba (por ejemplo, tomadas fuera del campo). ' +
            'Se muestran, pero no son una medición de tu parcela.',
        ),
        p(
          used
            ? used.used_as_evidence
              ? 'En la última evaluación esas lecturas se usaron como evidencia.'
              : 'En la última evaluación de la API, esas lecturas no se usaron como evidencia.'
            : 'Si se usaron o no como evidencia lo indica la evaluación de Rotaciones, que todavía no está cargada.',
        ),
        p(`La última lectura cargada es del ${formatDateTime(last.recorded_at)} y está marcada como de prueba.`),
      ],
      source: SRC_SENSOR_TEST,
    }
  }
  return {
    blocks: [
      p(
        `La última lectura cargada (${formatDateTime(last.recorded_at)}) no está marcada como de prueba: su calidad es «${last.quality_flag ?? 'sin indicar'}».`,
      ),
      p('Cuando una lectura viene de un kit de prueba, la API la marca y la app lo muestra como «dato de prueba».'),
    ],
    source: SRC_SENSOR,
  }
}

function answerRiskBand(d: GuideData): GuideAnswer {
  const blocks: GuideBlock[] = [
    p(
      'Para cada mes del año, la banda muestra entre qué valores estuvo la lluvia (o la temperatura) en los años anteriores: del mínimo al máximo, con la mediana. ' +
        'Resume lo que ya ocurrió; no es un pronóstico.',
    ),
    p('Un mes de un año solo cuenta si al menos 80 % de sus días tiene dato, y se necesitan 3 años o más para dibujar la banda.'),
  ]
  const h = d.history
  if (h?.data) {
    const rain = monthlyHistory(h.data.rain, 'sum', todayLima())
    if (rain.sufficient) {
      blocks.push(
        p(
          `En el histórico cargado de tu parcela entran ${rain.years} años (${rain.firstYear}–${rain.lastYear}); cada mes usa entre ${rain.nMin} y ${rain.nMax} años.`,
        ),
      )
    } else {
      blocks.push(
        p(
          `El histórico cargado tiene ${formatNumber(rain.spanYears, 1)} años de datos y no alcanza para mostrar la banda (se necesitan al menos 3 años con datos suficientes).`,
        ),
      )
    }
  } else {
    blocks.push(p(notLoaded('el histórico de 10 años de NASA POWER', 'm', h?.loading, h?.error)))
  }
  return { blocks, source: SRC_NASA_CALC }
}

function answerLastReading(d: GuideData): GuideAnswer {
  const rd = d.readings
  if (!rd?.data) {
    return { blocks: [p(`No puedo decirlo. ${notLoaded('las lecturas del sensor', 'fp', rd?.loading, rd?.error)}`)], source: SRC_SENSOR }
  }
  const last = latestAny(rd.data)
  if (!last) return { blocks: [p('El sensor todavía no tiene lecturas cargadas para esta parcela.')], source: SRC_SENSOR }
  const stale = isStale(last.recorded_at, d.now)
  const blocks: GuideBlock[] = [
    p(`El sensor midió la última lectura el ${formatDateTime(last.recorded_at)} (hora de Perú), ${formatAgo(last.recorded_at, d.now)}.`),
    p(`La API la recibió el ${formatDateTime(last.received_at)} (hora de Perú).`),
    p(
      stale
        ? `Pasaron más de ${SENSOR_STALE_MINUTES} minutos sin lecturas nuevas: el sensor aparece como «sin actualización».`
        : `Está dentro de los últimos ${SENSOR_STALE_MINUTES} minutos: el sensor sigue enviando datos.`,
    ),
  ]
  if (last.quality_flag === 'test') blocks.push(p('Esta lectura está marcada como dato de prueba.'))
  return { blocks, source: last.quality_flag === 'test' ? SRC_SENSOR_TEST : SRC_SENSOR }
}

// ---------------------------------------------------------------------------------------------------------------------
// 03 Rotaciones
// ---------------------------------------------------------------------------------------------------------------------

function answerNoRecommendation(d: GuideData): GuideAnswer {
  const rec = d.recommendation
  const link = { to: '/parcela', label: 'Completar datos en Parcela' }
  if (!rec?.data) {
    return { blocks: [p(`No puedo decirlo todavía. ${notLoaded('la evaluación de la API', 'f', rec?.loading, rec?.error)}`)], source: SRC_API }
  }
  const r = rec.data
  if (r.status === 'insufficient_data') {
    const max = 8
    const items = r.missing.slice(0, max).map((m) => `${fieldLabel(m.field, d.crops)}. ${m.reason}`)
    if (r.missing.length > max) items.push(`… y ${r.missing.length - max} más.`)
    return {
      blocks: [
        p(
          'La API respondió «datos insuficientes»: mientras falten datos no calcula alternativas ni puntajes, y la app no inventa valores para completarlos.',
        ),
        r.missing.length > 0 ? p('Falta:') : p('La API no detalló qué falta.'),
        ...(r.missing.length > 0 ? [ul(items)] : []),
      ],
      source: SRC_API,
      link,
    }
  }
  const blocks: GuideBlock[] = [p('La evaluación de tu parcela sí tiene resultado (estado: ok), así que no falta ningún dato para calcularlo.')]
  if (r.mode === 'escenario_demostracion') {
    blocks.push(p('Es un escenario de demostración con supuestos, no una recomendación para una parcela real.'))
  }
  return { blocks, source: SRC_API }
}

function answerDemo(d: GuideData): GuideAnswer {
  const blocks: GuideBlock[] = [
    p(
      'Es un ejemplo de cómo se comparan tres secuencias de dos campañas (una referencia y dos alternativas). ' +
        'No es una recomendación para tu parcela.',
    ),
    p(
      'Sus datos agronómicos son de prueba (puntuaciones, requisitos de cultivo y fechas supuestas). ' +
        'Lo único real es el histórico de NASA POWER de la zona.',
    ),
  ]
  const s = d.demo?.scenario
  if (s) {
    const lines = [s.supuestos.textura, s.supuestos.fechas].filter((t): t is string => !!t)
    if (lines.length > 0) blocks.push(p('Supuestos de este escenario:'), ul(lines))
  } else {
    blocks.push(p('Ábrelo para ver sus supuestos y las tres tarjetas.'))
  }
  return {
    blocks,
    source: `${SRC_DEMO} y ${SRC_NASA}`,
    link: s ? undefined : { to: '/rotaciones?escenario=demo', label: 'Abrir el escenario de demostración' },
  }
}

function answerStrategies(d: GuideData): GuideAnswer {
  const demo = d.demo
  if (!demo) {
    return {
      blocks: [p('Para describir las tres estrategias necesito que el escenario de demostración esté abierto: allí están sus cultivos y fechas.')],
      source: SRC_DEMO,
      link: { to: '/rotaciones?escenario=demo', label: 'Abrir el escenario de demostración' },
    }
  }
  const { scenario, tradeoffs } = demo
  const items = scenario.cards.map((c) => {
    const camps = c.alt.campaigns
    const seq = camps.map((k) => cropName(k.crop, d.crops)).join(' → ')
    const first = camps[0]
    const last = camps[camps.length - 1]
    const total = first && last ? daysBetween(first.starts_on, last.ends_on) : 0
    let text = `${c.nombre}: ${seq}, del ${formatDay(first.starts_on)} al ${formatDay(last.ends_on)} (${total} días).`
    const row = tradeoffs?.rows.find((r) => r.id === c.id)
    if (row) {
      const rain = row.stats.rain
      const temp = row.stats.temp
      text +=
        rain.sufficient && rain.min !== null && rain.max !== null && rain.median !== null
          ? ` Lluvia histórica en esas fechas: ${formatNumber(rain.min, 0)}–${formatNumber(rain.max, 0)} mm (mediana ${formatNumber(rain.median, 0)}, ${rain.n} años).`
          : ' Histórico de lluvia insuficiente para esas fechas.'
      if (temp.sufficient && temp.min !== null && temp.max !== null) {
        text += ` Temperatura media: ${formatFixed(temp.min, 1)}–${formatFixed(temp.max, 1)} °C.`
      }
    }
    return text
  })
  const blocks: GuideBlock[] = [
    p('Las tres tienen ventajas y costos distintos; esta guía no elige una. Lo que las diferencia hoy:'),
    ul(items),
  ]
  if (tradeoffs) {
    const note = sameSpanNote(tradeoffs.rows)
    if (note) blocks.push(p(note))
    const days = tradeoffs.rows.map((r) => `${r.nombre}: ${r.totalDays} días ocupados, ${r.freeDays} libres de 365.`)
    blocks.push(p('Duración y días libres hasta completar los 12 meses:'), ul(days))
  } else {
    blocks.push(p('El histórico de NASA POWER todavía no cargó, así que solo describo cultivos y fechas.'))
  }
  return { blocks, source: `${SRC_DEMO} y ${SRC_NASA_CALC}`, link: { to: '/rotaciones?escenario=demo', label: 'Ver el escenario' } }
}

function answerScores(d: GuideData): GuideAnswer {
  const blocks: GuideBlock[] = [
    p(
      'En el escenario de demostración, no: los puntajes y la puntuación por criterio son de prueba (sintéticos), no agronómicos. Están dentro de un bloque plegado «Criterio de prueba (sintético)».',
    ),
    p(
      'En una evaluación real también son criterios del prototipo para comparar: no son una probabilidad de éxito ni un rendimiento esperado.',
    ),
  ]
  const note = d.demo?.scenario.sintetico.puntuaciones
  if (note) blocks.push(p(`Lo que dice el escenario cargado: ${note}`))
  return { blocks, source: `${SRC_DEMO}; ${SRC_API}` }
}

// ---------------------------------------------------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------------------------------------------------

export const GUIDE_QUESTIONS: GuideQuestion[] = [
  { id: 'parcela-faltan', route: 'parcela', text: '¿Qué datos necesito completar?', answer: answerPlotMissing },
  { id: 'parcela-fecha', route: 'parcela', text: '¿Para qué sirve la fecha de la siguiente campaña?', answer: answerNextCampaign },
  { id: 'panel-sensor-nasa', route: 'panel', text: '¿Qué mide el sensor y qué mide la NASA?', answer: answerSensorVsNasa },
  { id: 'panel-prueba', route: 'panel', text: '¿Por qué dice dato de prueba?', answer: answerTestData },
  { id: 'panel-banda', route: 'panel', text: '¿Qué significa la banda de riesgo?', answer: answerRiskBand },
  { id: 'panel-ultima', route: 'panel', text: '¿Cuándo llegó la última lectura?', answer: answerLastReading },
  { id: 'rot-sin-reco', route: 'rotaciones', text: '¿Por qué no hay recomendación para mi parcela?', answer: answerNoRecommendation },
  { id: 'rot-demo', route: 'rotaciones', text: '¿Qué es el escenario de demostración?', answer: answerDemo },
  { id: 'rot-estrategias', route: 'rotaciones', text: '¿En qué se diferencian las tres estrategias?', answer: answerStrategies },
  { id: 'rot-puntajes', route: 'rotaciones', text: '¿Los puntajes son reales?', answer: answerScores },
]

export const questionsFor = (route: GuideRoute | null): GuideQuestion[] =>
  route ? GUIDE_QUESTIONS.filter((q) => q.route === route) : []

/** Texto plano de una respuesta (para lectores de pantalla y pruebas). */
export function answerText(a: GuideAnswer): string {
  return a.blocks.map((b) => (b.kind === 'p' ? b.text : b.items.map((i) => `– ${i}`).join('\n'))).join('\n')
}
