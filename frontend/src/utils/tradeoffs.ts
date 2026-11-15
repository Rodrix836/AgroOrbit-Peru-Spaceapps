import type { NasaObservation } from '../types/api'
import type { ScenarioCardModel } from '../types/scenario'
import { formatFixed, formatNumber } from './format'
import { addDays, daysBetween } from './period'
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
  /** Inicio de la primera campaña y fin de la última (AAAA-MM-DD). */
  startsOn: string
  endsOn: string
  /** true si cada campaña empieza el día siguiente al fin de la anterior (sin huecos ni solapes). */
  contiguous: boolean
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
    const contiguous = camps.every((k, i) => i === 0 || addDays(camps[i - 1].ends_on, 1) === k.starts_on)
    return {
      id: c.id,
      role: c.role,
      nombre: c.nombre,
      totalDays,
      freeDays: YEAR_DAYS - totalDays,
      startsOn: first?.starts_on ?? '',
      endsOn: last?.ends_on ?? '',
      contiguous,
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

  // 4) El año más lluvioso de la serie frente a un año típico (mediana).
  const ratioOf = (r: TradeoffRow) => {
    const st = r.stats.rain
    return st.sufficient && st.max !== null && st.median !== null && st.median > 0 ? st.max / st.median : null
  }
  out.push(
    rows
      .map((r, i) => {
        const x = ratioOf(r)
        if (i === 0) {
          return x === null
            ? `Para ${who(r)} no hay histórico suficiente para comparar el año más lluvioso con uno típico`
            : `En el año más lluvioso de la serie cayó ${n1(x)} veces la lluvia de un año típico (mediana) en ${who(r)}`
        }
        return x === null ? `sin histórico suficiente en ${who(r)}` : `${n1(x)} veces en ${who(r)}`
      })
      .join('; ') + '.',
  )
  return out
}

const shortDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-PE', { timeZone: 'UTC', day: 'numeric', month: 'short' })
}

const sameNumbers = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort((x, y) => x - y).every((v, i) => Math.abs(v - [...b].sort((x, y) => x - y)[i]) < 1e-9)

/**
 * Si dos o más alternativas ocupan exactamente las mismas fechas (sin huecos entre sus campañas) y dan el mismo clima
 * total, devuelve la nota que lo explica; si no, null.
 */
export function sameSpanNote(rows: TradeoffRow[]): string | null {
  const alts = rows.filter((r) => r.role !== 'reference' && r.contiguous && r.startsOn && r.endsOn)
  for (const a of alts) {
    const group = alts.filter(
      (b) =>
        b.startsOn === a.startsOn &&
        b.endsOn === a.endsOn &&
        sameNumbers(a.stats.rain.values, b.stats.rain.values) &&
        sameNumbers(a.stats.temp.values, b.stats.temp.values),
    )
    if (group.length >= 2) {
      const names = group.map((g) => (g.nombre.startsWith('Alternativa ') ? g.nombre.slice('Alternativa '.length) : g.nombre))
      return (
        `Las alternativas ${joinList(names)} ocupan las mismas fechas (${shortDay(a.startsOn)} – ${shortDay(a.endsOn)}), ` +
        'así que su clima total es el mismo. La diferencia está en qué cultivo recibe cada parte de la temporada.'
      )
    }
  }
  return null
}
