import { api } from '../services/api'
import { useAsync } from './useAsync'

/** Lecturas del sensor ESP32 de la parcela. */
export function useReadings(plotId: string | null) {
  return useAsync(plotId ? () => api.getReadings(plotId) : null, [plotId])
}
