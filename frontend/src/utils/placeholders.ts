import type { RecommendationResponse } from '../types/api'

/** Un marcador es un texto que empieza con "<" y termina con ">", p. ej. "<AAAA-MM-DD>". */
const PLACEHOLDER = /^\s*<[\s\S]*>\s*$/

/** true si algún texto dentro del valor (a cualquier profundidad) es un marcador. */
export function hasPlaceholders(value: unknown): boolean {
  if (typeof value === 'string') return PLACEHOLDER.test(value)
  if (Array.isArray(value)) return value.some(hasPlaceholders)
  if (value && typeof value === 'object') return Object.values(value).some(hasPlaceholders)
  return false
}

/**
 * Plan B: la respuesta es solo la maqueta del formato (textos <...> o todos los puntajes en 0)
 * y no un resultado del motor. Solo aplica a status "ok": con insufficient_data no hay alternativas
 * que proteger (y su `engine_version` puede traer un marcador sin que haya problema).
 */
export function isFormatMockup(rec: RecommendationResponse): boolean {
  if (rec.status !== 'ok') return false
  const alternatives = rec.alternatives ?? []
  const allZero = alternatives.length > 0 && alternatives.every((a) => a.score === 0)
  return allZero || hasPlaceholders(rec)
}
