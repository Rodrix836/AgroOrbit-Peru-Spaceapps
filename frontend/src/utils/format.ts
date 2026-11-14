const TZ = 'America/Lima'

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-PE', {
    timeZone: TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Fecha AAAA-MM-DD sin conversión de zona (evita correr un día). */
export function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  if (!y || !m || !d) return '—'
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-PE', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Día, mes y hora en formato de 24 horas (hora de Perú), p. ej. "14 nov, 16:51". */
export function formatShortTime(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    timeZone: TZ,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
}

/** Solo la hora en formato de 24 horas (hora de Perú), p. ej. "16:51". Para ejes de gráficos. */
export function formatHour24(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-PE', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
}

export function formatNumber(value: number, digits = 1): string {
  return value.toLocaleString('es-PE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

/** Pasado este tiempo sin lecturas nuevas, el sensor se considera "sin actualización". */
export const SENSOR_STALE_MINUTES = 15
export function isStale(iso: string, minutes = SENSOR_STALE_MINUTES): boolean {
  return Date.now() - new Date(iso).getTime() > minutes * 60_000
}

/** Unidades de la API (tal como las da POWER) a texto para mostrar. */
const UNIT_LABELS: Record<string, string> = {
  C: '°C',
  'mm/day': 'mm/día',
}
export function displayUnit(unit: string): string {
  return UNIT_LABELS[unit] ?? unit
}

/** Día AAAA-MM-DD corto para ejes de gráficos (sin año). */
export function formatDayShort(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  if (!y || !m || !d) return '—'
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-PE', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
  })
}
