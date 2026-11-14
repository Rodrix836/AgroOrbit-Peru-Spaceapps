// Tipos del contrato con la API FastAPI.
//
// SUPUESTO: los nombres de campos de plots/crops/readings/NASA se infirieron del plan
// (raw_value, calibrated_value, soil_moisture, soil_temperature, plot_id, horizon_days,
// priority). Confirmar con Rodrigo contra backend/docs/recommendations-contract.md
// y ajustar aquí; el resto del frontend solo importa estos tipos.
//
// PENDIENTE (no implementado en backend según el plan): POST /api/recommendations,
// `start_on` y `alternatives`.

export interface Plot {
  id: string
  name: string
  latitude: number
  longitude: number
}

export interface PlotInput {
  name: string
  latitude: number
  longitude: number
}

export interface Crop {
  id: string
  name: string
}

export type Irrigation = 'none' | 'limited' | 'available'
export type Priority = 'save_water' | 'improve_soil'

/** Datos del formulario de parcela que aún no tienen endpoint confirmado. */
export interface PlotPreferences {
  previousCropId: string
  currentCropId: string
  irrigation: Irrigation
  /** Inicio de la siguiente campaña, AAAA-MM-DD. */
  startOn: string
  priority: Priority
}

export type SensorType = 'soil_moisture' | 'soil_temperature'

export interface SensorReading {
  id: string
  sensor_type: SensorType
  /** Lectura cruda del ADC; solo para detalle técnico de calibración. */
  raw_value: number | null
  /** soil_moisture: % calibrado seco/húmedo. soil_temperature: °C. */
  calibrated_value: number | null
  unit: string
  /** ISO 8601 en UTC. */
  recorded_at: string
}

export interface NasaObservation {
  id: string
  /** Código POWER: T2M, T2M_MIN, T2M_MAX, PRECTOTCORR, RH2M, WS10M, ALLSKY_SFC_SW_DWN */
  variable: string
  /** Fecha AAAA-MM-DD (tiempo solar local de POWER). */
  observed_on: string
  value: number | null
  unit: string
  source: string
}

export interface RecommendationRequest {
  plot_id: string
  horizon_days: number
  priority: Priority
  /** PENDIENTE de confirmar en el contrato. */
  start_on?: string
  irrigation?: Irrigation
}

export interface Campaign {
  crop: string
  starts_on: string
  ends_on: string
}

export interface SourceRef {
  title: string
  url?: string
}

export interface Alternative {
  id: string
  rank: number
  /** Criterio del prototipo (0-100). No es probabilidad de éxito ni rendimiento. */
  score: number
  campaigns: Campaign[]
  reasons: string[]
  limitations: string[]
  sources: SourceRef[]
}

export interface RecommendationResponse {
  status: 'ok' | 'insufficient_data'
  engine_version: string
  /** Datos críticos que faltan cuando status = insufficient_data. */
  missing?: string[]
  selected_id?: string
  alternatives: Alternative[]
  created_at?: string
}
