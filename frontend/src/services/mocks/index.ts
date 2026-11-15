// Respuestas de EJEMPLO para avanzar sin API. No son mediciones reales.
// Tienen la forma exacta de backend/docs/examples/*.json (fuente de verdad: api-contract.md).
// La interfaz muestra un aviso visible cuando VITE_USE_MOCKS=true.
//
// PENDIENTE BACKEND: `mockCrops` y `mockRecommendation` se usan SIEMPRE (aunque VITE_USE_MOCKS
// sea false) porque GET /api/crops y POST /api/recommendations aún no existen.
import { ApiError } from '../apiError'
import type {
  Crop,
  CropCycle,
  CropCycleCreate,
  CropCycleUpdate,
  CropCyclesResponse,
  PlotUpdate,
  RecommendationContext,
  NasaObservation,
  NasaVariable,
  Plot,
  PlotInput,
  QualityFlag,
  RecommendationRequest,
  RecommendationResponse,
  SensorReading,
} from '../../types/api'
import crops from './crops.json'
import recommendationSoil from './recommendation-improve-soil.json'
import recommendationFormatMockup from './recommendation-format-mockup.json'
import recommendationInsufficient from './recommendation-insufficient-data.json'
import recommendationSave from './recommendation-save-water.json'
import { MOCK_SCENARIO, RECOMMENDATION_SCENARIO } from './scenario'

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

export function mockGetPlot(plotId: string): Plot {
  const plot = mockPlots.find((p) => p.id === plotId)
  if (!plot) throw new ApiError(404, 'Parcela no encontrada.', 'plot_not_found')
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

  // Última lectura: hace unos segundos (al día; el kit envía cada 10 s) o hace 3 h (sin actualización).
  const lastAt = Date.now() - (MOCK_SCENARIO === 'sensor_stale' ? 3 * HOUR : 4_000)
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

const NASA_UNITS: Record<NasaVariable, string> = {
  T2M: 'C',
  PRECTOTCORR: 'mm/day',
  GWETTOP: '1',
  GWETROOT: '1',
}

/** Número entre 0 y 1 que depende solo del año: da a cada año un clima distinto (para las bandas de riesgo). */
const yearFactor = (year: number) => {
  const x = Math.sin(year * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function nasaExampleValue(variable: NasaVariable, i: number, day: string): number {
  const year = Number(day.slice(0, 4))
  const doy = Math.floor((Date.UTC(year, Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))) - Date.UTC(year, 0, 0)) / DAY)
  const season = Math.sin((2 * Math.PI * (doy - 30)) / 365) // época de lluvias: verano
  const yf = 0.6 + 0.8 * yearFactor(year)
  const r2 = (n: number) => Math.round(n * 100) / 100
  switch (variable) {
    case 'T2M':
      return r2(25 + 3 * season + 0.8 * Math.sin(i / 5) + (yf - 1))
    case 'PRECTOTCORR':
      return (doy + year) % 6 === 0 ? r2((2 + 10 * Math.max(0, season)) * yf) : 0
    case 'GWETTOP':
      return r2(Math.min(0.95, Math.max(0.05, 0.32 + 0.12 * Math.sin(i / 11) + 0.06 * season)))
    case 'GWETROOT':
      return r2(0.45 + 0.07 * Math.sin(i / 23))
  }
}

/**
 * Observaciones guardadas de UNA variable (como `GET .../nasa/observations?variable=&from=&to=`):
 * hasta 11 años (4018 días) con unidades tal como las da POWER (solo las 4 variables que admite la API), ordenadas por día. Los últimos 4 días vienen null
 * (POWER publica con retraso), hay un hueco suelto, un tramo de ~45 días sin datos y marzo de 2019 sin datos.
 * En `nasa_down` lo guardado es de una importación antigua (hace 12 días). Con `sin_extras` solo existen
 * T2M y PRECTOTCORR, como antes de las 9 variables.
 */
export function mockNasa(range: { from: string; to: string }, variable: NasaVariable): NasaObservation[] {
  const out: NasaObservation[] = []
  if (MOCK_SCENARIO === 'sin_extras' && variable !== 'T2M' && variable !== 'PRECTOTCORR') return out
  const lag = MOCK_SCENARIO === 'nasa_down' ? 12 : 0
  const end = todayLima().getTime() - lag * DAY
  // historico_corto: solo hay ~2 años guardados, sin importar el rango pedido.
  const oldest = MOCK_SCENARIO === 'historico_corto' ? 800 : 4017
  for (let i = oldest; i >= 0; i--) {
    const day = new Date(end - i * DAY).toISOString().slice(0, 10)
    if (day < range.from || day > range.to) continue
    const missing = i <= 3 || i === 47 || (i >= 395 && i <= 440) || day.startsWith('2019-03')
    out.push({
      id: `${variable}-${day}`,
      variable,
      observed_on: day,
      value: missing ? null : nasaExampleValue(variable, i, day),
      unit: NASA_UNITS[variable],
      source: 'NASA POWER',
    })
  }
  return out
}

// ---------- Cultivos (GET /api/crops) ----------

export const mockCrops = crops as Crop[]

// ---------- Ciclos de cultivo (crop-cycles), en memoria ----------
// Mismas reglas que la API: un solo ciclo active y uno planned por parcela; varios finished.

const mockCycles: Record<string, CropCycle[]> = {}

const validationError = (field: string, message: string) =>
  new ApiError(422, message, 'validation_error', [{ field: `body.${field}`, message, type: 'value_error' }])

/** Orden de los ciclos terminados: coalesce(cosecha, siembra) descendente, nulos al final, luego created_at e id. */
function newestFirst(a: CropCycle, b: CropCycle): number {
  const ka = a.harvest_date ?? a.sowing_date ?? ''
  const kb = b.harvest_date ?? b.sowing_date ?? ''
  if (ka !== kb) return ka === '' ? 1 : kb === '' ? -1 : kb.localeCompare(ka)
  if (a.created_at !== b.created_at) return b.created_at.localeCompare(a.created_at)
  return b.id.localeCompare(a.id)
}

export function mockCropCycles(plotId: string): CropCyclesResponse {
  const all = mockCycles[plotId] ?? []
  const finished = all.filter((c) => c.status === 'finished').sort(newestFirst)
  return {
    previous: finished[0] ?? null,
    current: all.find((c) => c.status === 'active') ?? null,
    planned: all.find((c) => c.status === 'planned') ?? null,
    cycles: [...all].sort((a, b) => b.created_at.localeCompare(a.created_at)),
  }
}

function checkCycle(c: Pick<CropCycle, 'status' | 'crop_code' | 'sowing_date' | 'harvest_date'>) {
  if (c.crop_code !== null && !(crops as Crop[]).some((x) => x.id === c.crop_code)) {
    throw validationError('crop_code', 'Cultivo desconocido.')
  }
  if ((c.status === 'active' || c.status === 'finished') && !c.crop_code) {
    throw validationError('crop_code', 'Falta el cultivo.')
  }
  if (c.status === 'planned' && !c.sowing_date) {
    throw validationError('sowing_date', 'Falta la fecha de inicio.')
  }
  if (c.sowing_date && c.harvest_date && c.harvest_date < c.sowing_date) {
    throw validationError('harvest_date', 'La cosecha no puede ser antes de la siembra.')
  }
}

export function mockCreateCropCycle(plotId: string, body: CropCycleCreate): CropCycle {
  const all = (mockCycles[plotId] ??= [])
  const cycle: CropCycle = {
    id: crypto.randomUUID(),
    plot_id: plotId,
    crop_code: body.crop_code ?? null,
    sowing_date: body.sowing_date ?? null,
    harvest_date: body.harvest_date ?? null,
    status: body.status,
    origin: body.origin ?? 'farmer',
    created_at: iso(Date.now()),
  }
  checkCycle(cycle)
  const same = body.status === 'finished' ? undefined : all.find((c) => c.status === body.status)
  if (same) {
    const code = body.status === 'active' ? 'active_cycle_exists' : 'planned_cycle_exists'
    throw new ApiError(
      409,
      body.status === 'active' ? 'La parcela ya tiene un cultivo actual.' : 'La parcela ya tiene una próxima campaña.',
      code,
      { cycle_id: same.id },
    )
  }
  all.push(cycle)
  return cycle
}

export function mockUpdateCropCycle(plotId: string, cycleId: string, body: CropCycleUpdate): CropCycle {
  const all = mockCycles[plotId] ?? []
  const i = all.findIndex((c) => c.id === cycleId)
  if (i < 0) throw new ApiError(404, 'Ciclo de cultivo no encontrado.', 'cycle_not_found')
  const next: CropCycle = { ...all[i], ...body } as CropCycle
  checkCycle(next)
  all[i] = next
  return next
}

export function mockDeleteCropCycle(plotId: string, cycleId: string): void {
  const all = mockCycles[plotId] ?? []
  const i = all.findIndex((c) => c.id === cycleId)
  if (i < 0) throw new ApiError(404, 'Ciclo de cultivo no encontrado.', 'cycle_not_found')
  all.splice(i, 1)
}

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
    start: '2024-11-15',
    end: '2026-11-14',
    use: 'historico',
    indicators: {
      temperatura_promedio_c: 27.2,
      precipitacion_total_mm: 262.5,
      dias_analizados: 730,
      dias_temperatura_validos: 706,
      dias_precipitacion_validos: 706,
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
  if (RECOMMENDATION_SCENARIO === 'insufficient_data') {
    return recommendationInsufficient as RecommendationResponse
  }
  if (RECOMMENDATION_SCENARIO === 'format_mockup') {
    // Ejemplo del PR #7 tal cual: trae marcadores <...> y puntajes 0. La pantalla no debe mostrarlo como resultado.
    return recommendationFormatMockup as RecommendationResponse
  }
  const base = req.priority === 'improve_soil' ? recommendationSoil : recommendationSave
  const demo = RECOMMENDATION_SCENARIO === 'demo_mode' || RECOMMENDATION_SCENARIO === 'sin_extras'
  // Sin extras: las alternativas llegan sin desglose por criterio (`criteria: {}`).
  const alternatives = (base.alternatives as RecommendationResponse['alternatives']).map((a) =>
    RECOMMENDATION_SCENARIO === 'sin_extras' ? { ...a, criteria: {} } : a,
  )
  return {
    status: 'ok',
    mode: demo ? 'escenario_demostracion' : 'evaluacion',
    engine_version: base.engine_version,
    plot_id: req.plot_id,
    created_at: new Date().toISOString(),
    context: demo ? CONTEXT_DEMO : CONTEXT_OK,
    missing: [],
    selected_id: base.selected_id,
    alternatives,
  }
}
