// Tipos del contrato con la API FastAPI.
//
// Fuente de verdad: backend/docs/api-contract.md y backend/docs/examples/*.json (solo lectura).
// CONFIRMADO con el contrato: Plot, PlotInput, SensorReading, NasaObservation, formato de error.
//
// CONFIRMADO también: GET /api/crops, PATCH /api/plots/{id} y los ciclos de cultivo (crop-cycles).
//
// PENDIENTE BACKEND (sin ruta todavía): POST /api/recommendations. Sus tipos siguen la propuesta
// del PR #7 (pendiente de confirmar por Milene) y la respuesta sale de mocks (DATOS DE EJEMPLO).

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

// ---------- Ciclos de cultivo (cultivo anterior, actual y próxima campaña) ----------

export type CropCycleStatus = 'active' | 'finished' | 'planned'
export type CropCycleOrigin = 'farmer' | 'recommendation'

/** CropCycleRead del contrato. */
export interface CropCycle {
  id: string
  plot_id: string
  /** Id de GET /api/crops. null = cultivo pendiente (posible en `planned`). */
  crop_code: string | null
  /** AAAA-MM-DD. */
  sowing_date: string | null
  harvest_date: string | null
  status: CropCycleStatus
  origin: CropCycleOrigin
  created_at: string
}

/** GET /api/plots/{id}/crop-cycles. previous = último finished, current = active, planned = planned. */
export interface CropCyclesResponse {
  previous: CropCycle | null
  current: CropCycle | null
  planned: CropCycle | null
  /** Historial, del más reciente al más antiguo. */
  cycles: CropCycle[]
}

/** Cuerpo de POST /api/plots/{id}/crop-cycles. */
export interface CropCycleCreate {
  status: CropCycleStatus
  /** Obligatorio en active y finished. */
  crop_code?: string | null
  /** Obligatorio en planned. */
  sowing_date?: string | null
  harvest_date?: string | null
  origin?: CropCycleOrigin
}

/** Cuerpo de PATCH .../crop-cycles/{cycle_id}: solo los campos enviados. */
export type CropCycleUpdate = Partial<CropCycleCreate>

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

// ---------- Recomendaciones: POST /api/recommendations ----------
// PROPUESTA del PR #7 (backend/docs/api-contract.md, "Recomendaciones de rotación"): sin ruta
// todavía y pendiente de que Milene la confirme. PENDIENTE BACKEND: la pantalla usa mocks.

/** "evaluacion" = cálculo para la parcela; "escenario_demostracion" = hay datos supuestos (demo). */
export type RecommendationMode = 'evaluacion' | 'escenario_demostracion'

export type RecommendationStatus = 'ok' | 'insufficient_data'

/** Cuerpo de la petición (`start_on` es el inicio de la primera campaña, AAAA-MM-DD). */
export interface RecommendationRequest {
  plot_id: string
  priority: Priority
  start_on?: string
  /** Por defecto 365. */
  horizon_days?: number
}

/** Dato que falta para recomendar. `field` es del tipo "plot.…", "crops.<id>.requirements" o "climate.…". */
export interface MissingItem {
  field: string
  reason: string
}

/** Dato supuesto en un escenario de demostración. */
export interface Assumption {
  field: string
  value: string
  reason: string
}

export interface RecommendationContext {
  /** Aviso para mostrar (p. ej. «parcela representativa, no una chacra real»). */
  notice: string
  /** Fecha de inicio usada (la de la petición o la del ciclo planned); null si no hay. */
  start_on?: string | null
  /** null si no hay NASA POWER guardado. */
  power: {
    source: string
    /** "LST": hora solar local de POWER. */
    time_standard: string
    start: string
    end: string
    /** contexto_del_periodo = clima reciente, no un histórico. */
    use: 'contexto_del_periodo' | 'historico'
    /** temperatura_promedio_c, precipitacion_total_mm, dias_analizados, dias_temperatura_validos, dias_precipitacion_validos… */
    indicators: Record<string, number | string | null>
  } | null
  sensor: {
    quality_flag: string
    /** Las lecturas `test` no se usan como evidencia. */
    used_as_evidence: boolean
    reason: string
  }
  /** Solo con escenario_demostracion; vacío en otro caso. */
  assumptions: Assumption[]
}

export interface Campaign {
  /** Id de GET /api/crops (se muestra el nombre, no el id). */
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
  status: RecommendationStatus
  mode: RecommendationMode
  engine_version: string
  plot_id: string
  /** Momento del cálculo, ISO 8601 UTC (se muestra «Calculado: …» en hora de Perú). */
  created_at: string
  context: RecommendationContext
  /** Con insufficient_data lista lo que falta; [] en otro caso. */
  missing: MissingItem[]
  /** null con insufficient_data. */
  selected_id: string | null
  /** Vacía con insufficient_data (sin score). */
  alternatives: Alternative[]
}
