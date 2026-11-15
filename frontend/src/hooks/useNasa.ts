import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError, NASA_ERROR_CODES } from '../services/api'
import type { NasaObservation } from '../types/api'
import { NASA_VARIABLES } from '../utils/nasaVariables'
import { PERIODS, periodRange, type Period } from '../utils/period'
import { errorMessage } from './useAsync'

/** Problema al pedir datos nuevos a NASA POWER (POST .../nasa/power). */
export interface NasaProblem {
  message: string
  /** true = 503 nasa_power_unavailable o 502 nasa_power_invalid_response. */
  nasaDown: boolean
}

/** Período que se pidió y rango (AAAA-MM-DD) de los datos que se muestran. */
export interface NasaView {
  period: Period
  from: string
  to: string
}

/**
 * NASA POWER para la parcela. Al abrir (y con «Actualizar clima»):
 *  1. POST /nasa/power con {} (últimos 90 días) para consultar y guardar.
 *  2. GET /nasa/observations del período elegido (por defecto, 90 días): una petición por variable
 *     (las 9), cada una con su `variable` y su rango from/to; nunca todas juntas ni sin fechas.
 * Al cambiar de período solo se repite el paso 2.
 * Si el paso 1 falla (p. ej. NASA no disponible), igual se leen y muestran las observaciones guardadas.
 */
export function useNasa(plotId: string | null) {
  const [data, setData] = useState<NasaObservation[] | null>(null)
  const [view, setView] = useState<NasaView | null>(null)
  const [period, setPeriodState] = useState<Period>(PERIODS[0])
  const [loading, setLoading] = useState(plotId !== null)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [problem, setProblem] = useState<NasaProblem | null>(null)
  /** Variables cuya petición falló (las demás se muestran igual). */
  const [failed, setFailed] = useState<string[]>([])
  const runId = useRef(0)
  const periodRef = useRef<Period>(PERIODS[0])

  /** Lee las observaciones guardadas del período (GET con from y to). */
  const read = useCallback(
    async (id: number, p: Period) => {
      if (!plotId) return
      const range = periodRange(p)
      const results = await Promise.allSettled(
        NASA_VARIABLES.map((v) => api.getNasaObservations(plotId, range, v)),
      )
      if (id !== runId.current) return
      const ok = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
      if (ok.length === 0) {
        const first = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
        setData(null)
        setView(null)
        setFailed([])
        setError(errorMessage(first?.reason))
        return
      }
      setFailed(NASA_VARIABLES.filter((_, i) => results[i].status === 'rejected'))
      setData(
        ok.flat().sort((a, b) => a.observed_on.localeCompare(b.observed_on) || a.variable.localeCompare(b.variable)),
      )
      setView({ period: p, ...range })
    },
    [plotId],
  )

  const sync = useCallback(
    async (initial: boolean) => {
      const id = ++runId.current
      if (!plotId) {
        setData(null)
        setView(null)
        setLoading(false)
        return
      }
      if (initial) setLoading(true)
      else setRefreshing(true)
      setError(null)
      setProblem(null)

      try {
        await api.refreshNasaPower(plotId)
      } catch (e) {
        if (id === runId.current) {
          setProblem({
            message: errorMessage(e),
            nasaDown: e instanceof ApiError && NASA_ERROR_CODES.includes(e.code),
          })
        }
      }
      await read(id, periodRef.current)
      if (id === runId.current) {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [plotId, read],
  )

  // Descarta respuestas que lleguen tras desmontar o cambiar de parcela.
  const invalidate = useCallback(() => {
    runId.current++
  }, [])

  useEffect(() => {
    void sync(true)
    return invalidate
  }, [sync, invalidate])

  /** Cambia el período y vuelve a pedir solo las observaciones (sin consultar a NASA). */
  const setPeriod = useCallback(
    async (p: Period) => {
      periodRef.current = p
      setPeriodState(p)
      const id = ++runId.current
      setRefreshing(true)
      setError(null)
      await read(id, p)
      if (id === runId.current) setRefreshing(false)
    },
    [read],
  )

  const refresh = useCallback(() => sync(false), [sync])
  const reload = useCallback(() => void sync(true), [sync])
  return { data, view, period, setPeriod, loading, refreshing, error, problem, failed, refresh, reload }
}
