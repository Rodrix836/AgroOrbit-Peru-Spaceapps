import { useState } from 'react'
import { api } from '../services/api'
import { errorMessage, useAsync } from './useAsync'

/** Observaciones NASA POWER guardadas para la parcela + acción de actualizar. */
export function useNasa(plotId: string | null) {
  const q = useAsync(plotId ? () => api.getNasaObservations(plotId) : null, [plotId])
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)

  const refresh = async () => {
    if (!plotId) return
    setRefreshing(true)
    setRefreshError(null)
    try {
      await api.refreshNasaPower(plotId)
      q.reload()
    } catch (e) {
      setRefreshError(errorMessage(e))
    } finally {
      setRefreshing(false)
    }
  }

  return { ...q, refresh, refreshing, refreshError }
}
