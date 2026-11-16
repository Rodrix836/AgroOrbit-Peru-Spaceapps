// Preguntas y respuestas de la «Guía de AgroOrbit».
//
// La guía NO usa ningún modelo de IA ni llama a servicios externos: cada respuesta es una función que arma el texto con
// reglas y con los datos que la app ya tiene cargados (`GuideData`). Si un dato no está cargado, la respuesta lo dice;
// nunca se rellena con valores de ejemplo. No da consejos de siembra, riego ni rendimiento, y no declara ganadora a
// ninguna estrategia.
//
// Todos los textos salen del diccionario (`src/i18n/translations.ts`, claves `g.*` y `guide.*`) en el idioma activo.
// Para ampliarla: añade un objeto a `GUIDE_QUESTIONS` con su pantalla (`route`), la clave de la pregunta y una función
// `answer(data)` que devuelva párrafos, la fuente y, si aplica, un enlace. Si la respuesta necesita un dato que todavía
// no llega, publícalo desde la pantalla con `usePublishGuide` (ver `data.tsx`) y añade su tipo a `GuideData`.
import type { ClimateHistory } from '../../hooks/useClimateHistory'
import type { NasaProblem, NasaView } from '../../hooks/useNasa'
import { td } from '../../i18n/dataText'
import { tr } from '../../i18n/active'
import type { TKey } from '../../i18n/translations'
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
  /** Texto de la pregunta en el idioma activo. */
  readonly text: string
  answer: (d: GuideData) => GuideAnswer
}

const p = (text: string): GuideBlock => ({ kind: 'p', text })
const ul = (items: string[]): GuideBlock => ({ kind: 'ul', items })

const src = {
  get api() {
    return tr('g.src.api')
  },
  get apiPlot() {
    return tr('g.src.apiPlot')
  },
  get sensor() {
    return tr('g.src.sensor')
  },
  get sensorTest() {
    return tr('g.src.sensorTest')
  },
  get nasa() {
    return tr('g.src.nasa')
  },
  get nasaCalc() {
    return tr('g.src.nasaCalc')
  },
  get demo() {
    return tr('g.src.demo')
  },
}
const SENSOR_AND_NASA = (test: boolean) => tr('g.src.join', { a: test ? src.sensorTest : src.sensor, b: src.nasa })

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

type What = 'readings' | 'climate' | 'history' | 'evaluation'

/** Frase corta cuando una pantalla todavía no cargó algo: error, cargando o simplemente no cargado. */
function notLoaded(what: What, loading: boolean | undefined, error: string | null | undefined): string {
  if (error) return tr(`g.nl.${what}.error` as TKey, { error })
  if (loading) return tr(`g.nl.${what}.loading` as TKey)
  return tr(`g.nl.${what}.none` as TKey)
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
  if (!plot) return { blocks: [p(tr('g.plot.noPlot'))], source: src.api }
  const missing: string[] = []
  if (plot.water_availability === null) missing.push(tr('g.plot.mWater'))
  if (!isUiPriority(plot.priority)) missing.push(tr('g.plot.mPriority'))
  if (cycles) {
    if (!cycles.previous) missing.push(tr('g.plot.mPrev'))
    if (!cycles.current) missing.push(tr('g.plot.mCurr'))
    if (!cycles.planned?.sowing_date) missing.push(tr('g.plot.mStart'))
  }
  const blocks: GuideBlock[] = []
  if (!cycles) blocks.push(p(tr('g.plot.cyclesNotLoaded')))
  if (missing.length > 0) {
    blocks.push(p(tr('g.plot.missingIn', { name: td(plot.name) })), ul(missing))
  } else if (cycles) {
    blocks.push(p(tr('g.plot.complete', { name: td(plot.name) })))
  }
  // Lo que pidió la API en la última evaluación (si ya se cargó en Rotaciones).
  const rec = recommendation?.data
  if (rec && rec.status === 'insufficient_data') {
    const own = rec.missing.filter((m) => fieldGroup(m.field) === 'plot')
    if (own.length > 0) {
      blocks.push(p(tr('g.plot.apiAlso')), ul(own.map((m) => `${fieldLabel(m.field, crops)}. ${td(m.reason)}`)))
    }
  } else if (!rec) {
    blocks.push(p(tr('g.plot.openRotations')))
  }
  return { blocks, source: src.apiPlot, link: { to: '/rotaciones', label: tr('g.link.rotationsMissing') } }
}

function answerNextCampaign(d: GuideData): GuideAnswer {
  const date = d.cycles?.planned?.sowing_date ?? null
  const blocks: GuideBlock[] = [p(tr('g.next.explain'))]
  if (!d.plot) blocks.push(p(tr('g.next.noPlot')))
  else if (!d.cycles) blocks.push(p(tr('g.next.notLoaded')))
  else if (date) blocks.push(p(tr('g.next.has', { date: formatDay(date) })))
  else blocks.push(p(tr('g.next.none')))
  return { blocks, source: src.api, link: { to: '/rotaciones', label: tr('g.link.goRotations') } }
}

// ---------------------------------------------------------------------------------------------------------------------
// 02 Diagnóstico
// ---------------------------------------------------------------------------------------------------------------------

function answerSensorVsNasa(d: GuideData): GuideAnswer {
  const blocks: GuideBlock[] = [p(tr('g.sn.sensor')), p(tr('g.sn.nasa'))]
  let usedTest = false
  const rd = d.readings
  if (rd?.data) {
    const m = latestOf(rd.data, 'soil_moisture')
    const t = latestOf(rd.data, 'soil_temperature')
    const lines: string[] = []
    if (m) {
      lines.push(
        tr('g.sn.moist', {
          v: formatNumber(m.calibrated_value as number, 1),
          unit: m.unit || '%',
          when: formatDateTime(m.recorded_at),
        }),
      )
    }
    if (t) {
      lines.push(
        tr('g.sn.soilTemp', {
          v: formatNumber(t.calibrated_value as number, 1),
          unit: t.unit || '°C',
          when: formatDateTime(t.recorded_at),
        }),
      )
    }
    usedTest = [m, t].some((r) => r?.quality_flag === 'test')
    if (lines.length > 0) blocks.push(p(tr('g.sn.lastReading')), ul(lines))
    else blocks.push(p(tr('g.sn.noValues')))
  } else {
    blocks.push(p(notLoaded('readings', rd?.loading, rd?.error)))
  }
  const ns = d.nasa
  if (ns?.data && ns.view) {
    const s = nasaSummary(ns.data, ns.view)
    const lines: string[] = []
    if (s.t.n > 0) lines.push(tr('g.sn.airTemp', { v: formatNumber(s.t.sum / s.t.n, 1), n: s.t.n, days: s.days }))
    if (s.r.n > 0) lines.push(tr('g.sn.rain', { v: formatNumber(s.r.sum, 1), n: s.r.n, days: s.days }))
    if (lines.length > 0) {
      blocks.push(p(tr('g.sn.nasaPeriod', { from: formatDay(ns.view.from), to: formatDay(ns.view.to) })), ul(lines))
    } else blocks.push(p(tr('g.sn.nasaNone')))
  } else {
    blocks.push(p(notLoaded('climate', ns?.loading, ns?.error)))
  }
  return { blocks, source: SENSOR_AND_NASA(usedTest) }
}

function answerTestData(d: GuideData): GuideAnswer {
  const rd = d.readings
  if (!rd?.data) {
    return {
      blocks: [p(`${tr('g.td.cannotSay')} ${notLoaded('readings', rd?.loading, rd?.error)}`)],
      source: src.sensor,
    }
  }
  const last = latestAny(rd.data)
  if (!last) return { blocks: [p(tr('g.td.noReadings'))], source: src.sensor }
  if (last.quality_flag === 'test') {
    const used = d.recommendation?.data?.context?.sensor
    return {
      blocks: [
        p(tr('g.td.explain')),
        p(used ? (used.used_as_evidence ? tr('g.td.used') : tr('g.td.notUsed')) : tr('g.td.unknownUse')),
        p(tr('g.td.lastTest', { when: formatDateTime(last.recorded_at) })),
      ],
      source: src.sensorTest,
    }
  }
  return {
    blocks: [
      p(
        tr('g.td.notTest', {
          when: formatDateTime(last.recorded_at),
          quality: last.quality_flag ?? tr('g.td.notIndicated'),
        }),
      ),
      p(tr('g.td.hint')),
    ],
    source: src.sensor,
  }
}

function answerRiskBand(d: GuideData): GuideAnswer {
  const blocks: GuideBlock[] = [p(tr('g.rb.explain')), p(tr('g.rb.rules'))]
  const h = d.history
  if (h?.data) {
    const rain = monthlyHistory(h.data.rain, 'sum', todayLima())
    if (rain.sufficient) {
      blocks.push(
        p(
          tr('g.rb.years', {
            years: rain.years,
            first: rain.firstYear ?? '',
            last: rain.lastYear ?? '',
            min: rain.nMin,
            max: rain.nMax,
          }),
        ),
      )
    } else {
      blocks.push(p(tr('g.rb.short', { n: formatNumber(rain.spanYears, 1) })))
    }
  } else {
    blocks.push(p(notLoaded('history', h?.loading, h?.error)))
  }
  return { blocks, source: src.nasaCalc }
}

function answerLastReading(d: GuideData): GuideAnswer {
  const rd = d.readings
  if (!rd?.data) {
    return { blocks: [p(`${tr('g.lr.cannot')} ${notLoaded('readings', rd?.loading, rd?.error)}`)], source: src.sensor }
  }
  const last = latestAny(rd.data)
  if (!last) return { blocks: [p(tr('g.lr.none'))], source: src.sensor }
  const stale = isStale(last.recorded_at, d.now)
  const blocks: GuideBlock[] = [
    p(tr('g.lr.measured', { when: formatDateTime(last.recorded_at), ago: formatAgo(last.recorded_at, d.now) })),
    p(tr('g.lr.received', { when: formatDateTime(last.received_at) })),
    p(tr(stale ? 'g.lr.stale' : 'g.lr.fresh', { min: SENSOR_STALE_MINUTES })),
  ]
  if (last.quality_flag === 'test') blocks.push(p(tr('g.lr.test')))
  return { blocks, source: last.quality_flag === 'test' ? src.sensorTest : src.sensor }
}

// ---------------------------------------------------------------------------------------------------------------------
// 03 Rotaciones
// ---------------------------------------------------------------------------------------------------------------------

function answerNoRecommendation(d: GuideData): GuideAnswer {
  const rec = d.recommendation
  const link = { to: '/parcela', label: tr('g.link.completePlot') }
  if (!rec?.data) {
    return { blocks: [p(`${tr('g.nr.cannotYet')} ${notLoaded('evaluation', rec?.loading, rec?.error)}`)], source: src.api }
  }
  const r = rec.data
  if (r.status === 'insufficient_data') {
    const max = 8
    const items = r.missing.slice(0, max).map((m) => `${fieldLabel(m.field, d.crops)}. ${td(m.reason)}`)
    if (r.missing.length > max) items.push(tr('g.nr.more', { n: r.missing.length - max }))
    return {
      blocks: [
        p(tr('g.nr.insufficient')),
        r.missing.length > 0 ? p(tr('g.nr.missing')) : p(tr('g.nr.noDetail')),
        ...(r.missing.length > 0 ? [ul(items)] : []),
      ],
      source: src.api,
      link,
    }
  }
  const blocks: GuideBlock[] = [p(tr('g.nr.ok'))]
  if (r.mode === 'escenario_demostracion') blocks.push(p(tr('g.nr.demoMode')))
  return { blocks, source: src.api }
}

function answerDemo(d: GuideData): GuideAnswer {
  const blocks: GuideBlock[] = [p(tr('g.dm.p1')), p(tr('g.dm.p2'))]
  const s = d.demo?.scenario
  if (s) {
    const lines = [s.supuestos.textura, s.supuestos.fechas].filter((t): t is string => !!t).map(td)
    if (lines.length > 0) blocks.push(p(tr('g.dm.assumptions')), ul(lines))
  } else {
    blocks.push(p(tr('g.dm.open')))
  }
  return {
    blocks,
    source: tr('g.src.join', { a: src.demo, b: src.nasa }),
    link: s ? undefined : { to: '/rotaciones?escenario=demo', label: tr('g.link.openDemo') },
  }
}

function answerStrategies(d: GuideData): GuideAnswer {
  const demo = d.demo
  if (!demo) {
    return {
      blocks: [p(tr('g.st.needOpen'))],
      source: src.demo,
      link: { to: '/rotaciones?escenario=demo', label: tr('g.link.openDemo') },
    }
  }
  const { scenario, tradeoffs } = demo
  const items = scenario.cards.map((c) => {
    const camps = c.alt.campaigns
    const seq = camps.map((k) => cropName(k.crop, d.crops)).join(' → ')
    const first = camps[0]
    const last = camps[camps.length - 1]
    const total = first && last ? daysBetween(first.starts_on, last.ends_on) : 0
    let text = tr('g.st.item', {
      name: td(c.nombre),
      seq,
      from: formatDay(first.starts_on),
      to: formatDay(last.ends_on),
      days: total,
    })
    const row = tradeoffs?.rows.find((r) => r.id === c.id)
    if (row) {
      const rain = row.stats.rain
      const temp = row.stats.temp
      text +=
        ' ' +
        (rain.sufficient && rain.min !== null && rain.max !== null && rain.median !== null
          ? tr('g.st.rain', {
              min: formatNumber(rain.min, 0),
              max: formatNumber(rain.max, 0),
              median: formatNumber(rain.median, 0),
              n: rain.n,
            })
          : tr('g.st.rainNo'))
      if (temp.sufficient && temp.min !== null && temp.max !== null) {
        text += ' ' + tr('g.st.temp', { min: formatFixed(temp.min, 1), max: formatFixed(temp.max, 1) })
      }
    }
    return text
  })
  const blocks: GuideBlock[] = [p(tr('g.st.intro')), ul(items)]
  if (tradeoffs) {
    const note = sameSpanNote(tradeoffs.rows)
    if (note) blocks.push(p(note))
    const days = tradeoffs.rows.map((r) => tr('g.st.durItem', { name: td(r.nombre), days: r.totalDays, free: r.freeDays }))
    blocks.push(p(tr('g.st.durHeader')), ul(days))
  } else {
    blocks.push(p(tr('g.st.noHist')))
  }
  return {
    blocks,
    source: tr('g.src.join', { a: src.demo, b: src.nasaCalc }),
    link: { to: '/rotaciones?escenario=demo', label: tr('g.link.seeScenario') },
  }
}

function answerScores(d: GuideData): GuideAnswer {
  const blocks: GuideBlock[] = [p(tr('g.sc.p1')), p(tr('g.sc.p2'))]
  const note = d.demo?.scenario.sintetico.puntuaciones
  if (note) blocks.push(p(tr('g.sc.note', { note: td(note) })))
  return { blocks, source: tr('g.src.demoApi', { demo: src.demo, api: src.api }) }
}

// ---------------------------------------------------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------------------------------------------------

const q = (id: string, route: GuideRoute, key: TKey, answer: (d: GuideData) => GuideAnswer): GuideQuestion => ({
  id,
  route,
  get text() {
    return tr(key)
  },
  answer,
})

export const GUIDE_QUESTIONS: GuideQuestion[] = [
  q('parcela-faltan', 'parcela', 'g.q.plotMissing', answerPlotMissing),
  q('parcela-fecha', 'parcela', 'g.q.nextCampaign', answerNextCampaign),
  q('panel-sensor-nasa', 'panel', 'g.q.sensorNasa', answerSensorVsNasa),
  q('panel-prueba', 'panel', 'g.q.testData', answerTestData),
  q('panel-banda', 'panel', 'g.q.riskBand', answerRiskBand),
  q('panel-ultima', 'panel', 'g.q.lastReading', answerLastReading),
  q('rot-sin-reco', 'rotaciones', 'g.q.noReco', answerNoRecommendation),
  q('rot-demo', 'rotaciones', 'g.q.demo', answerDemo),
  q('rot-estrategias', 'rotaciones', 'g.q.strategies', answerStrategies),
  q('rot-puntajes', 'rotaciones', 'g.q.scores', answerScores),
]

export const questionsFor = (route: GuideRoute | null): GuideQuestion[] =>
  route ? GUIDE_QUESTIONS.filter((x) => x.route === route) : []

/** Texto plano de una respuesta (para lectores de pantalla y pruebas). */
export function answerText(a: GuideAnswer): string {
  return a.blocks.map((b) => (b.kind === 'p' ? b.text : b.items.map((i) => `– ${i}`).join('\n'))).join('\n')
}
