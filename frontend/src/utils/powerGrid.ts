import { tr } from '../i18n/active'
import { formatFixed } from './format'

/**
 * Rejilla meteorológica de NASA POWER.
 *
 * - Tamaño: ½° de latitud × ⅝° (0,625°) de longitud, referencia WGS84. Lo dice la metodología de POWER
 *   (power.larc.nasa.gov/docs/methodology, «Release 9»: «½° latitude by ⅝° longitude for the meteorological data sets»).
 * - Alineación: la documentación de POWER no la detalla. Se comprobó pidiendo a la API (daily/point, T2M) puntos a
 *   ambos lados de los bordes de las celdas: el valor cambia justo en lat = k·0,5° ± 0,25° y en
 *   lon = −180° + j·0,625° ± 0,3125° (probado en Piura y en Lima, en los cuatro bordes de la celda de Piura). Es decir,
 *   los centros están en múltiplos de 0,5° de latitud y en −180° + j·0,625° de longitud.
 */
export const POWER_LAT_STEP = 0.5
export const POWER_LON_STEP = 0.625

export type LatLngTuple = [number, number]

export interface PowerCell {
  /** Centro de la celda. */
  center: LatLngTuple
  /** Esquinas [sur-oeste, norte-este]. */
  bounds: [LatLngTuple, LatLngTuple]
}

/** Celda de la rejilla cuyo centro está más cerca del punto. */
export function powerCell(lat: number, lng: number): PowerCell {
  const cLat = Math.round(lat / POWER_LAT_STEP) * POWER_LAT_STEP
  const cLng = -180 + Math.round((lng + 180) / POWER_LON_STEP) * POWER_LON_STEP
  const halfLat = POWER_LAT_STEP / 2
  const halfLng = POWER_LON_STEP / 2
  return {
    center: [cLat, cLng],
    bounds: [
      [cLat - halfLat, cLng - halfLng],
      [cLat + halfLat, cLng + halfLng],
    ],
  }
}

/** Número de texto (acepta coma decimal) dentro del rango, o null. */
export function parseCoord(v: string | number | null | undefined, min: number, max: number): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v.trim().replace(',', '.'))
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

/** «4.75° S» / «80.94° W» (en español, «O» de oeste). */
export function formatDegrees(value: number, axis: 'lat' | 'lng'): string {
  const hemi =
    axis === 'lat' ? (value < 0 ? tr('geo.south') : tr('geo.north')) : value < 0 ? tr('geo.west') : tr('geo.east')
  return `${formatFixed(Math.abs(value), 2)}° ${hemi}`
}

/** Fecha AAAA-MM-DD (UTC) de hace `days` días: GIBS publica por día UTC y el de hoy puede no estar listo. */
export function utcDaysAgo(days: number, now = Date.now()): string {
  return new Date(now - days * 86_400_000).toISOString().slice(0, 10)
}
