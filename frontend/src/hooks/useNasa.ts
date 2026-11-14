import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError, NASA_ERROR_CODES } from '../services/api'
import type { NasaObservation } from '../types/api'
import { errorMessage } from './useAsync'

/** Problema al pedir datos nuevos a NASA POWER (POST .../nasa/power). */
export interface NasaProblem {
  message: string
  /** true = 503 nasa_power_unavailable o 502 nasa_power_invalid_response. */
  nasaDown: boolean
}

/**
 * NASA POWER para la parcela. Al abrir (y con "Actualizar clima"):
 *  1. POST /nasa/power con {} (últimos 90 días) para consultar y guardar.
 *  2. GET /nasa/observations para leer lo guardado.
 * Si el paso 1 falla (p. ej. NASA no disponible), igual se leen y muestran las observaciones guardadas.
 */
export function useNasa(plotId: string | null) {
  const [data, setData] = useState<NasaObservation[] | null>(null)
  const [loading, setLoading] = useState(plotId !== null)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [problem, setProblem] = useState<NasaProblem | null>(null)
  const runId = useRef(0)

  const sync = useCallback(
    async (initial: boolean) => {
      const id = ++runId.current
      if (!plotId) {
        setData(null)
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
      try {
        const obs = await api.getNasaObservations(plotId)
        if (id === runId.current) setData(obs)
      } catch (e) {
        if (id === runId.current) {
          setData(null)
          setError(errorMessage(e))
        }
      } finally {
        if (id === runId.current) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [plotId],
  )

  // Descarta respuestas que lleguen tras desmontar o cambiar de parcela.
  const invalidate = useCallback(() => {
    runId.current++
  }, [])

  useEffect(() => {
    void sync(true)
    return invalidate
  }, [sync, invalidate])

  const refresh = useCallback(() => sync(false), [sync])
  const reload = useCallback(() => void sync(true), [sync])
  return { data, loading, refreshing, error, problem, refresh, reload }
}
