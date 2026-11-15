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

/**
 * Histórico de NASA POWER para el bloque «Riesgo e incertidumbre»: dos peticiones (T2M y PRECTOTCORR), cada una con
 * su `variable` y su rango from = hoy − 10 años, to = hoy. Se piden en paralelo, aparte de los datos del período.
 */
export function useClimateHistory(plotId: string | null) {
  return useAsync<ClimateHistory>(
    plotId
      ? async () => {
          const to = todayLima()
          const range = { from: addYears(to, -HISTORY_YEARS), to }
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
        }
      : null,
    [plotId],
  )
}
