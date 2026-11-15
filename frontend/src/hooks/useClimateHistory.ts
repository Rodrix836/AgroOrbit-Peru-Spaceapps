import { api } from '../services/api'
import type { NasaObservation } from '../types/api'
import { addYears, todayLima } from '../utils/period'
import { useAsync } from './useAsync'

export interface ClimateHistory {
  /** T2M, de hoy − 10 años a hoy. */
  temperature: NasaObservation[]
  /** PRECTOTCORR, de hoy − 10 años a hoy. */
  rain: NasaObservation[]
  /** Cuánto tardó cada petición (ms), para medir la carga. */
  ms: { T2M: number; PRECTOTCORR: number; total: number }
}

/** Años de histórico que se piden. */
export const HISTORY_YEARS = 10

/** Cuánto se reutiliza una descarga ya hecha (ms). Pasado este tiempo, la siguiente pantalla vuelve a pedirla. */
const CACHE_TTL_MS = 10 * 60_000

// Caché en memoria compartida entre pantallas (Diagnóstico y Rotaciones): la misma petición no se repite.
// Se guarda la promesa, así dos pantallas que piden a la vez comparten una sola descarga. Las descargas
// fallidas se descartan para que «Reintentar» vuelva a pedir.
const cache = new Map<string, { at: number; promise: Promise<ClimateHistory> }>()

/** Descarga (o reutiliza) el histórico de 10 años de una parcela. Dos peticiones en paralelo: T2M y PRECTOTCORR. */
export function loadClimateHistory(plotId: string): Promise<ClimateHistory> {
  const to = todayLima()
  const key = `${plotId}|${to}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.promise

  const range = { from: addYears(to, -HISTORY_YEARS), to }
  const promise = (async () => {
    const t0 = performance.now()
    const timed = async (variable: 'T2M' | 'PRECTOTCORR') => {
      const t = performance.now()
      const rows = await api.getNasaObservations(plotId, range, variable)
      return { rows, ms: Math.round(performance.now() - t) }
    }
    const [t2m, rain] = await Promise.all([timed('T2M'), timed('PRECTOTCORR')])
    const total = Math.round(performance.now() - t0)
    console.info(
      `[AgroOrbit] Histórico NASA ${range.from} a ${range.to}: T2M ${t2m.rows.length} filas en ${t2m.ms} ms, ` +
        `PRECTOTCORR ${rain.rows.length} filas en ${rain.ms} ms (total ${total} ms)`,
    )
    return { temperature: t2m.rows, rain: rain.rows, ms: { T2M: t2m.ms, PRECTOTCORR: rain.ms, total } }
  })()
  cache.set(key, { at: Date.now(), promise })
  promise.catch(() => {
    if (cache.get(key)?.promise === promise) cache.delete(key)
  })
  return promise
}

/**
 * Histórico de NASA POWER para «Riesgo e incertidumbre» (02 Diagnóstico) y «Compensaciones entre estrategias»
 * (03 Rotaciones): dos peticiones (T2M y PRECTOTCORR), con su `variable` y su rango from = hoy − 10 años, to = hoy.
 * El resultado se comparte entre pantallas (ver `loadClimateHistory`).
 */
export function useClimateHistory(plotId: string | null) {
  return useAsync<ClimateHistory>(plotId ? () => loadClimateHistory(plotId) : null, [plotId])
}
