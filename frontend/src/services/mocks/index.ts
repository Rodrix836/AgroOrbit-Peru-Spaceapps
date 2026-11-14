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

/** Observaciones de ejemplo: 90 días terminando hace 2 días (POWER tiene retraso). */
export function mockNasa(): NasaObservation[] {
  const out: NasaObservation[] = []
  const end = Date.now() - 2 * 24 * HOUR
  const r1 = (n: number) => Math.round(n * 10) / 10
  for (let i = 89; i >= 0; i--) {
    const day = new Date(end - i * 24 * HOUR).toISOString().slice(0, 10)
    const t = 25 + 2.5 * Math.sin(i / 5)
    const add = (variable: string, value: number, unit: string) =>
      out.push({ id: `${variable}-${i}`, variable, observed_on: day, value, unit, source: 'NASA POWER' })
    add('T2M', r1(t), '°C')
    add('T2M_MIN', r1(t - 4), '°C')
    add('T2M_MAX', r1(t + 5), '°C')
    add('PRECTOTCORR', i % 9 === 0 ? 4.2 : 0, 'mm/día')
    add('RH2M', Math.round(70 + 8 * Math.cos(i / 6)), '%')
    add('ALLSKY_SFC_SW_DWN', r1(5.5 + 0.8 * Math.sin(i / 7)), 'kWh/m²/día')
  }
  return out
}

export function mockRecommendation(req: RecommendationRequest): RecommendationResponse {
  const base = req.priority === 'improve_soil' ? recommendationSoil : recommendationSave
  return { ...(base as RecommendationResponse), created_at: new Date().toISOString() }
}
