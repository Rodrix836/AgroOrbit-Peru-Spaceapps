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

export function formatShortTime(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    timeZone: TZ,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatNumber(value: number, digits = 1): string {
  return value.toLocaleString('es-PE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

export const HOURS_STALE = 6
export function isStale(iso: string, hours = HOURS_STALE): boolean {
  return Date.now() - new Date(iso).getTime() > hours * 3600_000
}
