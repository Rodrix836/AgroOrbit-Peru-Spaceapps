import type { NasaObservation } from '../types/api'

/** Un mes de un año solo cuenta si al menos este porcentaje de sus días tiene dato. */
export const MIN_MONTH_COVERAGE = 0.8
/** Con menos años válidos que esto no se muestra el rango. */
export const MIN_YEARS = 3

export interface MonthStat {
  /** 1 a 12. */
  month: number
  /** Años con el mes válido (≥ 80 % de días con dato). */
  n: number
  /** Mínimo, mediana y máximo del valor mensual entre esos años; null si n < MIN_YEARS. */
  min: number | null
  median: number | null
  max: number | null
  /** Valor del mes dentro de los últimos 12 meses (el más reciente válido); null si no hay. */
  last: number | null
  /** AAAA-MM del valor de `last`. */
  lastYm: string | null
}

export interface RiskResult {
  stats: MonthStat[]
  /** Años que entran en el cálculo: los del mes con más años válidos (el máximo de `n`). */
  years: number
  firstYear: number | null
  lastYear: number | null
  /** Menos y más años que usa un mes (entre los meses que tienen alguno). */
  nMin: number
  nMax: number
  /** years ≥ MIN_YEARS (si no, se muestra «Histórico insuficiente»). */
  sufficient: boolean
  /** Años de datos guardados: del primer al último día con valor (0 si no hay ninguno). */
  spanYears: number
}

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Cálculo del frontend sobre datos de NASA POWER: para cada mes del año (ene a dic), el valor mensual de cada
 * año disponible (suma de lluvia o promedio de temperatura de los días con dato), solo si el mes tiene al menos el
 * 80 % de sus días con dato. Devuelve mínimo, mediana y máximo entre años, y el valor de los últimos 12 meses.
 * Los días sin dato (value null) no cuentan: no se rellenan ni se toman como 0.
 * @param today día de hoy AAAA-MM-DD (define «los últimos 12 meses»).
 */
export function monthlyHistory(observations: NasaObservation[], kind: 'sum' | 'mean', today: string): RiskResult {
  // AAAA-MM → { suma, días con dato }
  const acc = new Map<string, { sum: number; n: number }>()
  for (const o of observations) {
    if (o.value === null) continue
    const ym = o.observed_on.slice(0, 7)
    const a = acc.get(ym) ?? { sum: 0, n: 0 }
    a.sum += o.value
    a.n++
    acc.set(ym, a)
  }

  // Meses válidos: AAAA-MM → valor mensual
  const valid = new Map<string, number>()
  for (const [ym, a] of acc) {
    const y = Number(ym.slice(0, 4))
    const m = Number(ym.slice(5, 7))
    if (a.n / daysInMonth(y, m) >= MIN_MONTH_COVERAGE) valid.set(ym, kind === 'sum' ? a.sum : a.sum / a.n)
  }

  // Ventana de los últimos 12 meses (incluye el mes actual).
  const ty = Number(today.slice(0, 4))
  const tm = Number(today.slice(5, 7))
  const windowStart = ty * 12 + (tm - 1) - 11

  const stats: MonthStat[] = []
  for (let m = 1; m <= 12; m++) {
    const values: number[] = []
    let last: number | null = null
    let lastYm: string | null = null
    for (const [ym, v] of valid) {
      if (Number(ym.slice(5, 7)) !== m) continue
      values.push(v)
      const idx = Number(ym.slice(0, 4)) * 12 + (m - 1)
      if (idx >= windowStart && idx <= ty * 12 + (tm - 1) && (lastYm === null || ym > lastYm)) {
        last = v
        lastYm = ym
      }
    }
    values.sort((a, b) => a - b)
    const enough = values.length >= MIN_YEARS
    stats.push({
      month: m,
      n: values.length,
      min: enough ? values[0] : null,
      median: enough ? median(values) : null,
      max: enough ? values[values.length - 1] : null,
      last,
      lastYm,
    })
  }

  // Años de datos guardados (primer y último día con valor), con independencia de si cada mes cumple el 80 %.
  let first: string | null = null
  let lastDay: string | null = null
  for (const o of observations) {
    if (o.value === null) continue
    if (first === null || o.observed_on < first) first = o.observed_on
    if (lastDay === null || o.observed_on > lastDay) lastDay = o.observed_on
  }
  const spanYears =
    first && lastDay ? (Date.parse(lastDay + 'T00:00:00Z') - Date.parse(first + 'T00:00:00Z') + 86_400_000) / 86_400_000 / 365.25 : 0

  const yearSet = new Set([...valid.keys()].map((ym) => Number(ym.slice(0, 4))))
  const ns = stats.map((s) => s.n).filter((n) => n > 0)
  const nMax = ns.length ? Math.max(...ns) : 0
  return {
    stats,
    // «Años» = los que entran en el mes con más años válidos (no cuenta años de los que solo sirve un mes suelto).
    years: nMax,
    firstYear: yearSet.size ? Math.min(...yearSet) : null,
    lastYear: yearSet.size ? Math.max(...yearSet) : null,
    nMin: ns.length ? Math.min(...ns) : 0,
    nMax,
    sufficient: nMax >= MIN_YEARS,
    spanYears,
  }
}
