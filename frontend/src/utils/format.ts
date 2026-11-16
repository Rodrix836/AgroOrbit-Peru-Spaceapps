import { localeOf, tr } from '../i18n/active'
import type { Lang } from '../i18n/translations'

// Todas las fechas y números salen en el idioma activo: en-US (inglés) o es-PE (español), siempre en hora de Perú.
const TZ = 'America/Lima'

/** Fecha y hora (hora de Perú) en el idioma pedido. en-US: «Nov 15, 2026, 07:56 PM» · es-PE: «15 nov. 2026, 07:56 p. m.». */
export function formatDateTimeIn(
  lang: Lang,
  input: string | number | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(localeOf(lang), {
    timeZone: TZ,
    day: lang === 'es' ? '2-digit' : 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  })
}

export function formatDateTime(iso: string): string {
  return formatDateTimeIn(localeOf() === 'es-PE' ? 'es' : 'en', iso)
}

/** Fecha AAAA-MM-DD sin conversión de zona (evita correr un día). */
export function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  if (!y || !m || !d) return '—'
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(localeOf(), {
    timeZone: 'UTC',
    day: localeOf() === 'es-PE' ? '2-digit' : 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Día, mes y hora en formato de 24 horas (hora de Perú), p. ej. «14 nov, 16:51» / «Nov 14, 16:51». */
export function formatShortTime(iso: string): string {
  return new Date(iso).toLocaleString(localeOf(), {
    timeZone: TZ,
    day: localeOf() === 'es-PE' ? '2-digit' : 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
}

/** Solo la hora en formato de 24 horas (hora de Perú), p. ej. "16:51". Para ejes de gráficos. */
export function formatHour24(iso: string): string {
  return new Date(iso).toLocaleTimeString(localeOf(), {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
}

export function formatNumber(value: number, digits = 1): string {
  return value.toLocaleString(localeOf(), {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

/** Número con siempre `digits` decimales (26 → «26.0»), para que los rangos se lean parejos. */
export function formatFixed(value: number, digits = 1): string {
  return value.toLocaleString(localeOf(), { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** Pasado este tiempo sin lecturas nuevas, el sensor se considera "sin actualización". */
export const SENSOR_STALE_MINUTES = 2 // el kit envía cada 10 s
export function isStale(iso: string, now = Date.now(), minutes = SENSOR_STALE_MINUTES): boolean {
  return now - new Date(iso).getTime() > minutes * 60_000
}

/** Cuánto pasó desde `iso`: «hace 12 s» / «12 s ago», «hace 3 min», «hace 2 h», «hace 4 d». */
export function formatAgo(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const s = Math.max(0, Math.round((now - t) / 1000))
  if (s < 60) return tr('ago.seconds', { n: s })
  const m = Math.floor(s / 60)
  if (m < 60) return tr('ago.minutes', { n: m })
  const h = Math.floor(m / 60)
  if (h < 24) return tr('ago.hours', { n: h })
  return tr('ago.days', { n: Math.floor(h / 24) })
}

/** Unidades de la API (tal como las da POWER) a texto para mostrar. */
export function displayUnit(unit: string): string {
  if (unit === 'C') return '°C'
  if (unit === 'mm/day') return tr('unit.mmDay')
  return unit
}

/** Día AAAA-MM-DD corto para ejes de gráficos (sin año). */
export function formatDayShort(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  if (!y || !m || !d) return '—'
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(localeOf(), {
    timeZone: 'UTC',
    day: localeOf() === 'es-PE' ? '2-digit' : 'numeric',
    month: 'short',
  })
}
