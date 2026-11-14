import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'
import type { SensorReading } from '../types/api'
import { errorMessage } from './useAsync'

/** Cada cuánto se vuelven a pedir las lecturas mientras el panel está abierto. */
export const SENSOR_REFRESH_MS = 30_000

/**
 * Lecturas del sensor ESP32 de la parcela (orden ascendente por recorded_at).
 * Se refrescan cada 30 s mientras el componente que usa el hook está montado.
 * Si un refresco en segundo plano falla, se conservan las últimas lecturas
 * (el aviso de "sensor sin actualización" sale por la antigüedad de la lectura).
 */
export function useReadings(plotId: string | null) {
  const [data, setData] = useState<SensorReading[] | null>(null)
  const [loading, setLoading] = useState(plotId !== null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!plotId) {
      setData(null)
      setLoading(false)
      return
    }
    let cancelled = false

    const load = async (initial: boolean) => {
      if (initial) {
        setLoading(true)
        setError(null)
      }
      try {
        const next = await api.getReadings(plotId)
        if (cancelled) return
        setData(next)
        setError(null)
      } catch (e) {
        if (cancelled) return
        if (initial) setError(errorMessage(e))
      } finally {
        if (!cancelled && initial) setLoading(false)
      }
    }

    void load(true)
    const timer = setInterval(() => {
      if (!document.hidden) void load(false)
    }, SENSOR_REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [plotId, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, loading, error, reload }
}
