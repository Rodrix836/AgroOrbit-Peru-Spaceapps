import type { NasaObservation } from '../types/api'
import type { ScenarioCardModel } from '../types/scenario'
import { formatFixed, formatNumber } from './format'
import { daysBetween } from './period'
import { strategyStats, toDaily, type StrategyStats } from './windowStats'

/** Los 12 meses que se quieren completar, en días. */
export const YEAR_DAYS = 365

export interface TradeoffRow {
  id: string
  role: ScenarioCardModel['role']
  /** «Referencia proyectada», «Alternativa A»… */
  nombre: string
  /** Del inicio de la primera campaña al fin de la última (días). */
  totalDays: number
  /** Días que quedan libres hasta completar los 12 meses. */
  freeDays: number
  stats: StrategyStats
}

export interface Tradeoffs {
  rows: TradeoffRow[]
  /** Primer y último año con dato en el histórico usado. */
  firstYear: number | null
  lastYear: number | null
}

/** Compara las estrategias con lo que pasó en años anteriores en las mismas fechas (T2M y PRECTOTCORR de NASA POWER). */
export function computeTradeoffs(
  cards: ScenarioCardModel[],
  history: { temperature: NasaObservation[]; rain: NasaObservation[] },
): Tradeoffs {
  const rain = toDaily(history.rain, 'PRECTOTCORR')
  const temp = toDaily(history.temperature, 'T2M')
  let firstYear: number | null = null
  let lastYear: number | null = null
  for (const k of [...rain.keys(), ...temp.keys()]) {
    const y = Number(k.slice(0, 4))
    if (firstYear === null || y < firstYear) firstYear = y
    if (lastYear === null || y > lastYear) lastYear = y
  }
  const rows: TradeoffRow[] = cards.map((c) => {
    const camps = c.alt.campaigns
    const first = camps[0]
    const last = camps[camps.length - 1]
    const totalDays = first && last ? daysBetween(first.starts_on, last.ends_on) : 0
    return {
      id: c.id,
      role: c.role,
      nombre: c.nombre,
      totalDays,
      freeDays: YEAR_DAYS - totalDays,
      stats: strategyStats(camps, rain, temp),
    }
  })
  return { rows, firstYear, lastYear }
}

const n0 = (v: number) => formatNumber(v, 0)
const n1 = (v: number) => formatFixed(v, 1)

/** «la Referencia», «la Alternativa A». */
const who = (r: TradeoffRow) => (r.role === 'reference' ? 'la Referencia' : `la ${r.nombre}`)
const whose = (r: TradeoffRow) => (r.role === 'reference' ? 'las de la Referencia' : `las de la ${r.nombre}`)

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

/** «45 días más libres», «45 días menos libres», «los mismos días libres». */
function freeDiff(d: number): string {
  if (d > 0) return `${d} ${d === 1 ? 'día más libre' : 'días más libres'}`
  if (d < 0) return `${-d} ${-d === 1 ? 'día menos libre' : 'días menos libres'}`
  return 'los mismos días libres'
}

/**
 * Tres frases descriptivas a partir de los números (días, lluvia y temperatura). Sin «mejor», «recomendada»,
 * «ahorra agua» ni «gana».
 */
export function tradeoffSentences(rows: TradeoffRow[]): string[] {
  if (rows.length === 0) return []
  const out: string[] = []
  const ref = rows.find((r) => r.role === 'reference')
  const alts = rows.filter((r) => r !== ref)

  // 1) Días ocupados y días libres.
  if (ref && alts.length > 0) {
    const sameDays = alts.every((a) => a.totalDays === alts[0].totalDays)
    if (sameDays) {
      const diff = ref.totalDays - alts[0].totalDays
      const many = alts.length > 1
      out.push(
        `La Referencia ocupa ${n0(ref.totalDays)} días; ${many ? 'las alternativas' : 'la alternativa'}, ` +
          `${n0(alts[0].totalDays)}: ${many ? 'dejan' : 'deja'} ${freeDiff(diff)} en el año.`,
      )
    } else {
      out.push(
        `La Referencia ocupa ${n0(ref.totalDays)} días; ` +
          alts
            .map((a) => `${who(a)}, ${n0(a.totalDays)} (${freeDiff(ref.totalDays - a.totalDays)} que la Referencia)`)
            .join('; ') +
          '.',
      )
    }
  } else {
    out.push(`${joinList(rows.map((r) => `${who(r)} ocupa ${n0(r.totalDays)} días`))} de los ${YEAR_DAYS} del año.`)
  }

  // 2) Lluvia histórica en sus fechas.
  out.push(
    rows
      .map((r, i) => {
        const st = r.stats.rain
        const ok = st.sufficient && st.min !== null && st.max !== null
        const range = ok ? `entre ${n0(st.min as number)} y ${n0(st.max as number)} mm` : ''
        if (i === 0) {
          return ok
            ? `En las fechas de ${who(r)} la lluvia histórica varió ${range}`
            : `Para las fechas de ${who(r)} no hay histórico suficiente de lluvia`
        }
        return ok ? `en ${whose(r)}, ${range}` : `para ${whose(r)}, no hay histórico suficiente`
      })
      .join('; ') + '.',
  )

  // 3) Temperatura media histórica en sus fechas.
  out.push(
    rows
      .map((r, i) => {
        const st = r.stats.temp
        const ok = st.sufficient && st.min !== null && st.max !== null
        const range = ok ? `entre ${n1(st.min as number)} y ${n1(st.max as number)} °C` : ''
        if (i === 0) {
          return ok
            ? `La temperatura media histórica en las fechas de ${who(r)} estuvo ${range}`
            : `Para las fechas de ${who(r)} no hay histórico suficiente de temperatura`
        }
        return ok ? `en ${whose(r)}, ${range}` : `para ${whose(r)}, no hay histórico suficiente`
      })
      .join('; ') + '.',
  )
  return out
}
