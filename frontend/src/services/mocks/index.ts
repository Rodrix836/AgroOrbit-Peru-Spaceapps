// Respuestas de EJEMPLO para avanzar sin API. No son mediciones reales.
// Tienen la forma exacta de backend/docs/examples/*.json (fuente de verdad: api-contract.md).
// La interfaz muestra un aviso visible cuando VITE_USE_MOCKS=true.
//
// PENDIENTE BACKEND: `mockCrops` y `mockRecommendation` se usan SIEMPRE (aunque VITE_USE_MOCKS
// sea false) porque GET /api/crops y POST /api/recommendations aún no existen.
import type {
  Crop,
  PlotUpdate,
  RecommendationContext,
  NasaObservation,
  Plot,
  PlotInput,
  QualityFlag,
  RecommendationRequest,
  RecommendationResponse,
  SensorReading,
} from '../../types/api'
import crops from './crops.json'
import recommendationSoil from './recommendation-improve-soil.json'
import recommendationInsufficient from './recommendation-insufficient-data.json'
import recommendationSave from './recommendation-save-water.json'
import { MOCK_SCENARIO } from './scenario'

export { MOCK_SCENARIO, SCENARIOS, type MockScenario } from './scenario'

const MINUTE = 60_000
const HOUR = 3600_000
const DAY = 24 * HOUR

/** ISO 8601 UTC sin milisegundos, como en los ejemplos del contrato. */
const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z')

// ---------- Parcela (PlotRead) ----------

export const MOCK_PLOT_ID = 'f544f739-bc06-45c6-9cf9-052c44499ab6'

export const mockPlots: Plot[] = [
  {
    id: MOCK_PLOT_ID,
    user_id: '6d729673-640c-4527-b7fe-42d32fd949d9',
    name: 'Parcela demostrativa – Valle del Chira (Sullana, Piura)',
    latitude: -4.97,
    longitude: -80.89,
    area_ha: null,
    water_source: null,
    water_availability: 'medium',
    soil_texture: null,
    soil_ph: null,
    soil_salinity_ds_m: null,
    priority: 'save_water',
    declared_irrigated: null,
    created_at: '2026-11-14T17:33:30Z',
  },
]

/** Respuesta de POST /api/plots: PlotInput más id, user_id y created_at. */
export function mockCreatePlot(input: PlotInput): Plot {
  const plot: Plot = {
    id: crypto.randomUUID(),
    user_id: mockPlots[0].user_id,
    name: input.name,
    latitude: input.latitude,
    longitude: input.longitude,
    area_ha: input.area_ha ?? null,
    water_source: input.water_source ?? null,
    water_availability: input.water_availability ?? null,
    soil_texture: input.soil_texture ?? null,
    soil_ph: input.soil_ph ?? null,
    soil_salinity_ds_m: input.soil_salinity_ds_m ?? null,
    priority: input.priority ?? null,
    declared_irrigated: input.declared_irrigated ?? null,
    created_at: iso(Date.now()),
  }
  mockPlots.push(plot) // para que aparezca en la lista, como con la API real
  return plot
}

/** Respuesta de PATCH /api/plots/{id}: aplica solo los campos enviados y devuelve la parcela completa. */
export function mockUpdatePlot(plotId: string, patch: PlotUpdate): Plot {
  const i = mockPlots.findIndex((p) => p.id === plotId)
  if (i < 0) throw new Error('Parcela de ejemplo no encontrada.')
  const next = { ...mockPlots[i], ...patch } as Plot
  mockPlots[i] = next
  return next
}

// ---------- Sensor ESP32 (SensorReading[], orden ascendente) ----------

const DEVICE_ID = 'dca83203-c87b-41d5-bfb3-1c5cc7ee5c0b'

/** Lecturas de las últimas 24 h, una cada 15 min, según el escenario. */
export function mockReadings(): SensorReading[] {
  if (MOCK_SCENARIO === 'sensor_empty') return []

  // Última lectura: hace 2 min (al día) o hace 3 h (sin actualización).
  const lastAt = Date.now() - (MOCK_SCENARIO === 'sensor_stale' ? 3 * HOUR : 2 * MINUTE)
  const STEP = 15 * MINUTE
  const out: SensorReading[] = []

  for (let i = 96; i >= 0; i--) {
    const at = lastAt - i * STEP
    const isLast = i === 0
    const dry = MOCK_SCENARIO === 'sensor_dry' && isLast
    const moisture = dry ? 0 : 38 + 8 * Math.sin(i / 8)
    const temp = 27 + 3 * Math.cos(i / 6)
    const flag = (kind: 'moisture' | 'temp'): QualityFlag => {
      if (MOCK_SCENARIO === 'sensor_test') return 'test'
      if (MOCK_SCENARIO === 'sensor_suspect' && isLast && kind === 'moisture') return 'suspect'
      if (dry && kind === 'moisture') return 'clamped_dry'
      return 'ok'
    }
    const common = { device_id: DEVICE_ID, recorded_at: iso(at), received_at: new Date(at + 4_000).toISOString() }
    out.push({
      id: `m-${i}`,
      sensor_type: 'soil_moisture',
      raw_value: Math.round(2400 - moisture * 12),
      calibrated_value: Math.round(moisture * 10) / 10,
      unit: '%',
      quality_flag: flag('moisture'),
      ...common,
    })
    out.push({
      id: `t-${i}`,
      sensor_type: 'soil_temperature',
      raw_value: Math.round(temp * 100) / 100,
      calibrated_value: Math.round(temp * 100) / 100,
      unit: '°C',
      quality_flag: flag('temp'),
      ...common,
    })
  }
  return out
}

// ---------- NASA POWER (NasaObservation[]) ----------

/** Día de hoy AAAA-MM-DD en hora de Perú (UTC-5), que se parece a la LST de POWER. */
const todayLima = () => new Date(Date.now() - 5 * HOUR)

/**
 * Observaciones guardadas: 90 días, T2M ("C") y PRECTOTCORR ("mm/day"), ordenadas por día y variable.
 * Los últimos 4 días vienen null (POWER publica con retraso) y hay un hueco suelto a mitad de serie.
 * En `nasa_down` lo guardado es de una importación antigua (hace 12 días).
 */
export function mockNasa(): NasaObservation[] {
  const out: NasaObservation[] = []
  const lag = MOCK_SCENARIO === 'nasa_down' ? 12 : 0
  const end = todayLima().getTime() - lag * DAY
  const r2 = (n: number) => Math.round(n * 100) / 100
  for (let i = 89; i >= 0; i--) {
    const day = new Date(end - i * DAY).toISOString().slice(0, 10)
    const missing = i <= 3 || i === 47
    const add = (variable: string, value: number, unit: string) =>
      out.push({
        id: `${variable}-${day}`,
        variable,
        observed_on: day,
        value: missing ? null : value,
        unit,
        source: 'NASA POWER',
      })
    add('PRECTOTCORR', i % 9 === 0 ? 4.2 : 0, 'mm/day')
    add('T2M', r2(25 + 2.5 * Math.sin(i / 5)), 'C')
  }
  return out
}

// ---------- Cultivos (GET /api/crops) ----------

export const mockCrops = crops as Crop[]

// ---------- PENDIENTE BACKEND: POST /api/recommendations ----------
// Forma de la propuesta del PR #7. `insufficient_data` es el ejemplo real del PR, tal cual.
// `normal` y `demo_mode` son nuestros ejemplos (los del PR traen marcadores <...> y puntaje 0).

const POWER_EXAMPLE = {
  source: 'NASA POWER',
  time_standard: 'LST',
  start: '2026-11-01',
  end: '2026-11-14',
  use: 'contexto_del_periodo' as const,
  indicators: {
    temperatura_promedio_c: 27.15,
    precipitacion_total_mm: 107.57,
    dias_analizados: 14,
    dias_temperatura_validos: 11,
    dias_precipitacion_validos: 11,
  },
}

/** Evaluación de ejemplo: histórico de NASA POWER (valores de muestra). Nuestro kit es de prueba: no es evidencia. */
const CONTEXT_OK: RecommendationContext = {
  notice: '[Ejemplo] Evaluación de muestra con datos declarados de la parcela; no proviene del motor de reglas.',
  power: {
    source: 'NASA POWER',
    time_standard: 'LST',
    start: '2025-11-01',
    end: '2026-10-31',
    use: 'historico',
    indicators: {
      temperatura_promedio_c: 26.4,
      precipitacion_total_mm: 180.2,
      dias_analizados: 365,
      dias_temperatura_validos: 360,
      dias_precipitacion_validos: 360,
    },
  },
  sensor: {
    quality_flag: 'test',
    used_as_evidence: false,
    reason: 'Lecturas del ESP32 tomadas fuera del campo.',
  },
  assumptions: [],
}

/** Escenario de demostración: lecturas de prueba (no son evidencia) y supuestos explícitos. */
const CONTEXT_DEMO: RecommendationContext = {
  notice:
    'Escenario de demostración: los datos marcados en assumptions son supuestos, no declarados por un agricultor. Parcela representativa, no una chacra real.',
  power: POWER_EXAMPLE,
  sensor: {
    quality_flag: 'test',
    used_as_evidence: false,
    reason: 'Lecturas del ESP32 tomadas fuera del campo.',
  },
  assumptions: [
    { field: 'plot.previous_crop', value: 'maiz', reason: 'Supuesto del escenario de demostración.' },
    { field: 'plot.water_availability', value: 'low', reason: 'Supuesto del escenario de demostración.' },
  ],
}

export function mockRecommendation(req: RecommendationRequest): RecommendationResponse {
  if (MOCK_SCENARIO === 'insufficient_data') {
    return recommendationInsufficient as RecommendationResponse
  }
  const base = req.priority === 'improve_soil' ? recommendationSoil : recommendationSave
  const demo = MOCK_SCENARIO === 'demo_mode'
  return {
    status: 'ok',
    mode: demo ? 'escenario_demostracion' : 'evaluacion',
    engine_version: base.engine_version,
    plot_id: req.plot_id,
    context: demo ? CONTEXT_DEMO : CONTEXT_OK,
    missing: [],
    selected_id: base.selected_id,
    alternatives: base.alternatives as RecommendationResponse['alternatives'],
  }
}
