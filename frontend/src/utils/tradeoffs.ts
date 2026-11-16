import type { NasaObservation } from '../types/api'
import type { ScenarioCardModel } from '../types/scenario'
import { formatFixed, formatNumber } from './format'
import { addDays, daysBetween } from './period'
import { strategyStats, toDaily, type StrategyStats } from './windowStats'
import { td } from '../i18n/dataText'
import { localeOf, tr } from '../i18n/active'

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

/** «la Referencia», «Alternative A» / «la Alternativa A» (el nombre de la estrategia viene de los datos y se traduce). */
const who = (r: TradeoffRow) =>
  r.role === 'reference' ? tr('tr.who.ref') : tr('tr.who.alt', { name: td(r.nombre) })
const whose = (r: TradeoffRow) =>
  r.role === 'reference' ? tr('tr.whose.ref') : tr('tr.whose.alt', { name: td(r.nombre) })

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} ${tr('tr.and')} ${items[items.length - 1]}`
}

/** «45 días más libres», «45 días menos libres», «los mismos días libres». */
function freeDiff(d: number): string {
  if (d > 0) return tr(d === 1 ? 'tr.free.moreOne' : 'tr.free.moreMany', { n: d })
  if (d < 0) return tr(-d === 1 ? 'tr.free.lessOne' : 'tr.free.lessMany', { n: -d })
  return tr('tr.free.same')
}

/**
 * Cuatro frases descriptivas a partir de los números (días, lluvia, temperatura y año más lluvioso). Sin «mejor»,
 * «recomendada», «ahorra agua» ni «gana».
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
      out.push(
        tr(alts.length > 1 ? 'tr.s1.sameMany' : 'tr.s1.sameOne', {
          ref: n0(ref.totalDays),
          alt: n0(alts[0].totalDays),
          diff: freeDiff(ref.totalDays - alts[0].totalDays),
        }),
      )
    } else {
      out.push(
        tr('tr.s1.diff', {
          ref: n0(ref.totalDays),
          parts: alts
            .map((a) =>
              tr('tr.s1.diffPart', {
                who: who(a),
                days: n0(a.totalDays),
                diff: freeDiff(ref.totalDays - a.totalDays),
              }),
            )
            .join('; '),
        }),
      )
    }
  } else {
    out.push(
      tr('tr.s1.noRef', {
        parts: joinList(rows.map((r) => tr('tr.s1.noRefPart', { who: who(r), days: n0(r.totalDays) }))),
        year: YEAR_DAYS,
      }),
    )
  }

  // 2) Lluvia histórica en sus fechas.
  out.push(
    rows
      .map((r, i) => {
        const st = r.stats.rain
        const ok = st.sufficient && st.min !== null && st.max !== null
        const range = ok ? tr('tr.range.rain', { a: n0(st.min as number), b: n0(st.max as number) }) : ''
        if (i === 0) {
          return ok ? tr('tr.rain.first', { who: who(r), range }) : tr('tr.rain.firstNo', { who: who(r) })
        }
        return ok ? tr('tr.rain.next', { whose: whose(r), range }) : tr('tr.rain.nextNo', { whose: whose(r) })
      })
      .join('; ') + '.',
  )

  // 3) Temperatura media histórica en sus fechas.
  out.push(
    rows
      .map((r, i) => {
        const st = r.stats.temp
        const ok = st.sufficient && st.min !== null && st.max !== null
        const range = ok ? tr('tr.range.temp', { a: n1(st.min as number), b: n1(st.max as number) }) : ''
        if (i === 0) {
          return ok ? tr('tr.temp.first', { who: who(r), range }) : tr('tr.temp.firstNo', { who: who(r) })
        }
        return ok ? tr('tr.rain.next', { whose: whose(r), range }) : tr('tr.rain.nextNo', { whose: whose(r) })
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
          return x === null ? tr('tr.ratio.firstNo', { who: who(r) }) : tr('tr.ratio.first', { x: n1(x), who: who(r) })
        }
        return x === null ? tr('tr.ratio.nextNo', { who: who(r) }) : tr('tr.ratio.next', { x: n1(x), who: who(r) })
      })
      .join('; ') + '.',
  )
  return out
}

const shortDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(localeOf(), { timeZone: 'UTC', day: 'numeric', month: 'short' })
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
      const names = group.map((g) => td(g.nombre).replace(/^(Alternativa|Alternative) /, ''))
      return tr('tr.sameSpan', { names: joinList(names), from: shortDay(a.startsOn), to: shortDay(a.endsOn) })
    }
  }
  return null
}
