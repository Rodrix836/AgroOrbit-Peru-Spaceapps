/** Períodos de NASA POWER que se pueden pedir a GET /nasa/observations (from y to, AAAA-MM-DD). */
export type PeriodId = '90d' | '1y' | '2y'

export interface Period {
  id: PeriodId
  /** Texto corto del selector. */
  short: string
  /** Texto del período visible: «Últimos 90 días: 17 ago. 2026 a 14 nov. 2026». */
  label: string
  /** Días del período, contando hoy. */
  days: number
}

export const PERIODS: Period[] = [
  { id: '90d', short: '90 días', label: 'Últimos 90 días', days: 90 },
  { id: '1y', short: '1 año', label: 'Último año', days: 365 },
  { id: '2y', short: '2 años', label: 'Últimos 2 años', days: 730 },
]

/** Hoy (AAAA-MM-DD) en hora de Perú (UTC-5), que coincide con la hora solar local de POWER. */
export function todayLima(): string {
  return new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10)
}

/** Suma `n` días (puede ser negativo) a un día AAAA-MM-DD, sin corrimientos de zona horaria. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** Rango del período: termina hoy y suma `days` días contando hoy (90 días = el mismo rango que POST /nasa/power con {}). */
export function periodRange(period: Period): { from: string; to: string } {
  const to = todayLima()
  return { from: addDays(to, -(period.days - 1)), to }
}

/** Días entre dos fechas AAAA-MM-DD, contando ambas. */
export function daysBetween(from: string, to: string): number {
  const t = (d: string) => {
    const [y, m, day] = d.split('-').map(Number)
    return Date.UTC(y, m - 1, day)
  }
  return Math.round((t(to) - t(from)) / 86_400_000) + 1
}
