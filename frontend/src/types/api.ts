// Tipos del contrato con la API FastAPI.
//
// Fuente de verdad: backend/docs/api-contract.md y backend/docs/examples/*.json (solo lectura).
// CONFIRMADO con el contrato: Plot, PlotInput, SensorReading, NasaObservation, formato de error.
//
// CONFIRMADO también: GET /api/crops y PATCH /api/plots/{id}.
//
// PENDIENTE BACKEND (no existe en la API todavía): POST /api/recommendations. Sus tipos
// (RecommendationRequest/Response, incl. `mode`, `context` y `missing`) son SUPUESTOS y la
// respuesta sale de mocks (DATOS DE EJEMPLO) hasta que Rodrigo los confirme.

// ---------- Formato de error (todas las rutas) ----------

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details: unknown
  }
}

// ---------- Parcelas ----------

export type WaterAvailability = 'low' | 'medium' | 'high'

/** Los 5 valores que acepta la API. La interfaz solo ofrece dos (ver `Priority`). */
export type ApiPriority =
  | 'save_water'
  | 'improve_soil'
  | 'reduce_climate_risk'
  | 'diversify'
  | 'maintain_productivity'

/** Prioridades que ofrece la interfaz. */
export type Priority = Extract<ApiPriority, 'save_water' | 'improve_soil'>

/** PlotRead del contrato. */
export interface Plot {
  id: string
  user_id: string
  name: string
  latitude: number
  longitude: number
  area_ha: number | null
  water_source: string | null
  water_availability: WaterAvailability | null
  soil_texture: string | null
  soil_ph: number | null
  soil_salinity_ds_m: number | null
  priority: ApiPriority | null
  declared_irrigated: boolean | null
  created_at: string
}

/** Cuerpo de POST /api/plots: solo name, latitude y longitude son obligatorios. */
export interface PlotInput {
  name: string
  latitude: number
  longitude: number
  area_ha?: number | null
  water_source?: string | null
  water_availability?: WaterAvailability | null
  soil_texture?: string | null
  soil_ph?: number | null
  soil_salinity_ds_m?: number | null
  priority?: ApiPriority | null
  declared_irrigated?: boolean | null
}

/** Perfil de POST/GET /api/users/me. */
export interface UserProfile {
  id: string
  auth_user_id: string | null
  display_name: string
  created_at: string
}

/** Cuerpo de PATCH /api/plots/{id}: solo los campos enviados cambian; null borra un campo opcional. */
export type PlotUpdate = Partial<PlotInput>

/** Cultivo de GET /api/crops (catálogo público: solo id y nombre). */
export interface Crop {
  id: string
  name: string
}

/**
 * Datos del formulario de parcela que la API todavía no guarda (cultivo anterior, cultivo actual
 * y fecha de la próxima campaña: falta la tabla crop_cycle). Se conservan solo en este navegador.
 * El agua y la prioridad ya se guardan en la parcela (PATCH /api/plots/{id}).
 */
export interface PlotPreferences {
  previousCropId: string
  currentCropId: string
  /** Inicio de la siguiente campaña, AAAA-MM-DD. */
  startOn: string
}

// ---------- Sensor ESP32 ----------

export type SensorType = 'soil_moisture' | 'soil_temperature'

/** `test` lo pone la API a las lecturas de kits de prueba. */
export type QualityFlag = 'ok' | 'clamped_dry' | 'clamped_wet' | 'suspect' | 'test'

/** Lectura de GET /api/plots/{id}/sensors/readings (orden ascendente por recorded_at). */
export interface SensorReading {
  id: string
  device_id: string
  sensor_type: SensorType
  /** Lectura cruda del ADC; solo para detalle técnico de calibración. */
  raw_value: number
  /** soil_moisture: % calibrado seco/húmedo. soil_temperature: °C. */
  calibrated_value: number | null
  unit: string
  quality_flag: QualityFlag | null
  /** ISO 8601 en UTC: cuándo midió el sensor. */
  recorded_at: string
  /** ISO 8601 en UTC: cuándo la recibió la API. */
  received_at: string
}

// ---------- NASA POWER ----------

/** Variables que guarda la API hoy. */
export type NasaVariable = 'T2M' | 'PRECTOTCORR'

export interface NasaObservation {
  id: string
  /** T2M (temperatura del aire a 2 m) o PRECTOTCORR (precipitación). */
  variable: NasaVariable | string
  /** Fecha AAAA-MM-DD en hora solar local (LST) de POWER. */
  observed_on: string
  /** null = POWER no tiene el dato (no es 0). */
  value: number | null
  /** Tal como la da POWER: "C" o "mm/day". Convertir solo para mostrar. */
  unit: string
  source: string
}

/** Respuesta de POST /api/plots/{id}/nasa/power. */
export interface NasaImportResult {
  plot_id: string
  latitude: number
  longitude: number
  start: string
  end: string
  source: string
  time_standard: 'LST'
  variables: string[]
  unidades: Record<string, string>
  dias: number
  filas_guardadas: number
  valores_faltantes: number
  fetched_at: string
}

// ---------- Recomendaciones (PENDIENTE BACKEND: POST /api/recommendations) ----------

/** "evaluacion" = cálculo para la parcela; "escenario_demostracion" = datos de demostración. */
export type RecommendationMode = 'evaluacion' | 'escenario_demostracion'

/** Dato que falta para recomendar (status = insufficient_data). */
export interface MissingItem {
  /** Nombre del campo que falta. */
  field: string
  /** Por qué hace falta o por qué no se pudo usar. */
  reason: string
}

/**
 * PENDIENTE BACKEND: formato de `context` no cerrado; todos los campos internos son opcionales.
 * Con qué datos se calculó la recomendación.
 */
export interface RecommendationContext {
  /** Período de NASA POWER usado (AAAA-MM-DD, LST). */
  start?: string
  end?: string
  /** Indicadores del período (nombres por confirmar). */
  indicadores?: Record<string, number | string | null>
  /** true = la parcela es una ubicación representativa, no una chacra real. */
  representative_plot?: boolean
  representative_plot_notice?: string
}

export interface RecommendationRequest {
  plot_id: string
  horizon_days: number
  priority: Priority
  /** PENDIENTE de confirmar en el contrato. */
  start_on?: string
  water_availability?: WaterAvailability
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
  /** PENDIENTE BACKEND. Con "escenario_demostracion" la pantalla avisa que no es para una parcela real. */
  mode?: RecommendationMode
  engine_version: string
  /** PENDIENTE BACKEND: período NASA POWER usado y aviso de parcela representativa. */
  context?: RecommendationContext
  /** Datos que faltan cuando status = insufficient_data. */
  missing?: MissingItem[]
  selected_id?: string
  /** Con insufficient_data no llegan alternativas (ni puntajes). */
  alternatives?: Alternative[]
  created_at?: string
}
