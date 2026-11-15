import type { NasaObservation } from '../types/api'
import { MIN_YEARS } from './climateRisk'

/** Un año solo cuenta si la ventana de la campaña tiene al menos este porcentaje de días con dato. */
export const MIN_WINDOW_COVERAGE = 0.8
/** Con menos años válidos que esto no se muestra el rango («Histórico insuficiente para estas fechas»). */
export const MIN_WINDOW_YEARS = MIN_YEARS

/** Día AAAA-MM-DD → valor diario de NASA POWER. Los días sin dato (null) no están en el mapa. */
export type DailyMap = Map<string, number>

export function toDaily(observations: NasaObservation[], variable: 'T2M' | 'PRECTOTCORR'): DailyMap {
  const m: DailyMap = new Map()
  for (const o of observations) {
    if (o.variable !== variable) continue
    if (typeof o.value !== 'number' || !Number.isFinite(o.value)) continue
    m.set(o.observed_on, o.value)
  }
  return m
}

const DAY_MS = 86_400_000
const utc = (day: string) => {
  const [y, m, d] = day.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
const isoOf = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

/** Mismo día y mes, `n` años después (o antes). El 29 de febrero pasa al 28 si ese año no es bisiesto. */
export function shiftYears(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const ty = y + n
  const dd = m === 2 && d === 29 && !isLeap(ty) ? 28 : d
  return `${String(ty).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
}

export interface WindowSample {
  /** Suma de los valores de los días con dato. */
  sum: number
  /** Días con dato. */
  n: number
  /** Días de la ventana (inicio y fin incluidos). */
  days: number
}

/** Suma y cuenta los días con dato de una ventana [start, end]. Los días sin dato no se rellenan ni valen 0. */
export function windowSample(daily: DailyMap, start: string, end: string): WindowSample {
  const a = utc(start)
  const b = utc(end)
  let sum = 0
  let n = 0
  let days = 0
  for (let t = a; t <= b; t += DAY_MS) {
    days++
    const v = daily.get(isoOf(t))
    if (v !== undefined) {
      sum += v
      n++
    }
  }
  return { sum, n, days }
}

const valid = (s: WindowSample) => s.days > 0 && s.n / s.days >= MIN_WINDOW_COVERAGE

export interface RangeStat {
  /** Años válidos. */
  n: number
  /** Mínimo, mediana y máximo entre años; null si n < MIN_WINDOW_YEARS. */
  min: number | null
  median: number | null
  max: number | null
  sufficient: boolean
  /** Año (o temporada, p. ej. «2016–17» si la ventana cruza el año) del mínimo y del máximo; null si el rango es insuficiente. */
  minLabel: string | null
  maxLabel: string | null
  /** Valor de cada año válido (sin ordenar), por si hace falta. */
  values: number[]
}

/** Un valor de un año válido con el año (o temporada) al que corresponde. */
export interface YearValue {
  value: number
  label: string
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Mínimo, mediana y máximo de los años válidos. Si hay empate, el año del mínimo/máximo es el primero (el más antiguo). */
export function rangeStat(entries: YearValue[]): RangeStat {
  const sorted = [...entries].sort((a, b) => a.value - b.value)
  const s = sorted.map((e) => e.value)
  const ok = s.length >= MIN_WINDOW_YEARS
  const lastValue = s[s.length - 1]
  return {
    n: s.length,
    min: ok ? s[0] : null,
    median: ok ? median(s) : null,
    max: ok ? lastValue : null,
    sufficient: ok,
    minLabel: ok ? sorted[0].label : null,
    maxLabel: ok ? (sorted.find((e) => e.value === lastValue) as YearValue).label : null,
    values: entries.map((e) => e.value),
  }
}

/** «2017» si la ventana cae en un solo año; «2016–17» si cruza el año. */
export function seasonLabel(start: string, end: string): string {
  const a = start.slice(0, 4)
  const b = end.slice(0, 4)
  return a === b ? a : `${a}–${b.slice(2)}`
}

export interface CampaignWindow {
  starts_on: string
  ends_on: string
}

export interface CampaignStats {
  /** Lluvia total de la ventana (mm) entre años. */
  rain: RangeStat
  /** Temperatura media de la ventana (°C) entre años. */
  temp: RangeStat
}

export interface StrategyStats {
  campaigns: CampaignStats[]
  /** Suma de la lluvia de sus campañas (mm), solo en los años en que todas son válidas. */
  rain: RangeStat
  /** Temperatura media de todos los días con dato de sus campañas (°C), solo en los años en que todas son válidas. */
  temp: RangeStat
  /** Cuánto cambió la lluvia de un año a otro (máx − mín, mm); null si el histórico es insuficiente. */
  variability: number | null
}

/**
 * Para cada campaña toma su ventana (mismo día y mes de inicio y fin) en cada año disponible y calcula la lluvia total y
 * la temperatura media. Un año solo cuenta si la ventana tiene al menos 80 % de días con dato. Una ventana que cruza el
 * año (p. ej. 1 dic. a 4 abr.) se corre completa. Para la estrategia entera, un año cuenta solo si todas sus campañas
 * son válidas ese año: la lluvia se suma y la temperatura es el promedio de todos los días con dato.
 * Cálculo del frontend sobre NASA POWER; no interpola ni rellena huecos.
 */
export function strategyStats(windows: CampaignWindow[], rain: DailyMap, temp: DailyMap): StrategyStats {
  if (windows.length === 0) {
    const empty = rangeStat([])
    return { campaigns: [], rain: empty, temp: empty, variability: null }
  }
  // Años con datos (de las dos series) para saber cuántos años hacia atrás hay que mirar.
  let firstYear = Infinity
  let lastYear = -Infinity
  for (const k of [...rain.keys(), ...temp.keys()]) {
    const y = Number(k.slice(0, 4))
    if (y < firstYear) firstYear = y
    if (y > lastYear) lastYear = y
  }
  const baseYear = Number(windows[0].starts_on.slice(0, 4))
  const lo = Number.isFinite(firstYear) ? firstYear - baseYear - 1 : 0
  const hi = Number.isFinite(lastYear) ? lastYear - baseYear : 0

  const perCampaign: { rain: YearValue[]; temp: YearValue[] }[] = windows.map(() => ({ rain: [], temp: [] }))
  const stratRain: YearValue[] = []
  const stratTemp: YearValue[] = []

  for (let s = lo; s <= hi; s++) {
    let rainOk = true
    let tempOk = true
    let rainSum = 0
    let tSum = 0
    let tN = 0
    windows.forEach((w, i) => {
      const a = shiftYears(w.starts_on, s)
      const b = shiftYears(w.ends_on, s)
      const r = windowSample(rain, a, b)
      const t = windowSample(temp, a, b)
      const label = seasonLabel(a, b)
      if (valid(r)) perCampaign[i].rain.push({ value: r.sum, label })
      else rainOk = false
      if (valid(t)) perCampaign[i].temp.push({ value: t.sum / t.n, label })
      else tempOk = false
      rainSum += r.sum
      tSum += t.sum
      tN += t.n
    })
    // Año (o temporada) de la estrategia: del inicio de la primera campaña al fin de la última, en ese año del histórico.
    const label = seasonLabel(shiftYears(windows[0].starts_on, s), shiftYears(windows[windows.length - 1].ends_on, s))
    if (rainOk) stratRain.push({ value: rainSum, label })
    if (tempOk && tN > 0) stratTemp.push({ value: tSum / tN, label })
  }

  const rainStat = rangeStat(stratRain)
  return {
    campaigns: perCampaign.map((c) => ({ rain: rangeStat(c.rain), temp: rangeStat(c.temp) })),
    rain: rainStat,
    temp: rangeStat(stratTemp),
    variability: rainStat.sufficient && rainStat.max !== null && rainStat.min !== null ? rainStat.max - rainStat.min : null,
  }
}
