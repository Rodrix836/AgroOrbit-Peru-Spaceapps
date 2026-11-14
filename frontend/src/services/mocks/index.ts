// Respuestas de EJEMPLO para avanzar sin API. No son mediciones reales.
// La interfaz muestra un aviso visible cuando VITE_USE_MOCKS=true.
import type {
  Crop,
  NasaObservation,
  Plot,
  RecommendationResponse,
  RecommendationRequest,
  SensorReading,
} from '../../types/api'
import crops from './crops.json'
import recommendationSave from './recommendation-save-water.json'
import recommendationSoil from './recommendation-improve-soil.json'

export const mockCrops = crops as Crop[]

export const mockPlots: Plot[] = [
  { id: 'ejemplo-1', name: 'Parcela de ejemplo (Piura)', latitude: -5.2, longitude: -80.63 },
]

const HOUR = 3600_000

/** Lecturas de ejemplo de las últimas 48 h, una cada 2 h, relativas a ahora. */
export function mockReadings(): SensorReading[] {
  const now = Date.now()
  const out: SensorReading[] = []
  for (let i = 24; i >= 0; i--) {
    const t = new Date(now - i * 2 * HOUR).toISOString()
    const moisture = 38 + 8 * Math.sin(i / 4)
    out.push({
      id: `m-${i}`,
      sensor_type: 'soil_moisture',
      raw_value: Math.round(2400 - moisture * 12),
      calibrated_value: Math.round(moisture * 10) / 10,
      unit: '%',
      recorded_at: t,
    })
    out.push({
      id: `t-${i}`,
      sensor_type: 'soil_temperature',
      raw_value: null,
      calibrated_value: Math.round((27 + 3 * Math.cos(i / 3)) * 10) / 10,
      unit: '°C',
      recorded_at: t,
    })
  }
  return out
}

/** Observaciones de ejemplo: 30 días terminando hace 2 días (POWER tiene retraso). */
export function mockNasa(): NasaObservation[] {
  const out: NasaObservation[] = []
  const end = Date.now() - 2 * 24 * HOUR
  for (let i = 29; i >= 0; i--) {
    const day = new Date(end - i * 24 * HOUR).toISOString().slice(0, 10)
    out.push({
      id: `t2m-${i}`,
      variable: 'T2M',
      observed_on: day,
      value: Math.round((25 + 2.5 * Math.sin(i / 5)) * 10) / 10,
      unit: '°C',
      source: 'NASA POWER',
    })
    out.push({
      id: `pr-${i}`,
      variable: 'PRECTOTCORR',
      observed_on: day,
      value: i % 9 === 0 ? 4.2 : 0,
      unit: 'mm/día',
      source: 'NASA POWER',
    })
  }
  return out
}

export function mockRecommendation(req: RecommendationRequest): RecommendationResponse {
  const base = req.priority === 'improve_soil' ? recommendationSoil : recommendationSave
  return { ...(base as RecommendationResponse), created_at: new Date().toISOString() }
}
