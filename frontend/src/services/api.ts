// Cliente de FastAPI: ÚNICO punto de acceso a datos del frontend.
// Contrato: backend/docs/api-contract.md (fuente de verdad).
import type {
  ApiErrorBody,
  Crop,
  CropCycle,
  CropCycleCreate,
  CropCycleUpdate,
  CropCyclesResponse,
  NasaImportResult,
  NasaVariable,
  NasaObservation,
  Plot,
  PlotInput,
  PlotUpdate,
  RecommendationRequest,
  RecommendationResponse,
  SensorReading,
  UserProfile,
} from '../types/api'
import { ApiError } from './apiError'
import { supabase } from './supabase'
import {
  MOCK_SCENARIO,
  mockCreateCropCycle,
  mockCreatePlot,
  mockCropCycles,
  mockCrops,
  mockDeleteCropCycle,
  mockGetPlot,
  mockUpdateCropCycle,
  mockUpdatePlot,
  mockNasa,
  mockPlots,
  mockReadings,
  mockRecommendation,
} from './mocks'

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'
const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

/**
 * De dónde sale la recomendación: VITE_RECOMMENDATIONS_SOURCE=mock (por defecto) | api.
 * Se llama a la API solo con "api" y VITE_USE_MOCKS=false; en cualquier otro caso salen mocks.
 */
export const RECOMMENDATIONS_SOURCE = import.meta.env.VITE_RECOMMENDATIONS_SOURCE === 'api' ? 'api' : 'mock'
/** true = la recomendación que se muestra es de ejemplo (la pantalla lo rotula como DATOS DE EJEMPLO). */
export const RECOMMENDATIONS_ARE_MOCK = USE_MOCKS || RECOMMENDATIONS_SOURCE !== 'api'

/** Códigos de error de la API que significan "NASA POWER no está disponible". */
export const NASA_ERROR_CODES = ['nasa_power_unavailable', 'nasa_power_invalid_response']

/** Mensajes en español para los códigos estables de la API (`error.code`). */
const MESSAGES: Record<string, string> = {
  missing_token: 'Tu sesión terminó. Vuelve a iniciar sesión.',
  invalid_token: 'Tu sesión no es válida. Vuelve a iniciar sesión.',
  token_expired: 'Tu sesión venció. Vuelve a iniciar sesión.',
  plot_not_found: 'No encontramos esa parcela. Puede que no exista o que no sea tuya.',
  profile_not_found: 'Falta crear tu perfil de usuario. Cierra sesión y vuelve a entrar.',
  nasa_power_unavailable:
    'NASA POWER no responde en este momento. Inténtalo de nuevo en unos minutos.',
  nasa_power_invalid_response:
    'NASA POWER respondió con datos incompletos o no válidos, y no los usamos.',
  cycle_not_found: 'No encontramos ese ciclo de cultivo. Recarga la página e inténtalo de nuevo.',
  active_cycle_exists: 'La parcela ya tiene un cultivo actual.',
  planned_cycle_exists: 'La parcela ya tiene una próxima campaña.',
  validation_error: 'Algunos datos no son válidos. Revisa los campos e inténtalo de nuevo.',
  invalid_date_range: 'El rango de fechas no es válido.',
  network_error: 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.',
}

export { ApiError }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (supabase) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, MESSAGES.network_error, 'network_error')
  }
  if (!res.ok) {
    let code = 'unknown'
    let apiMessage = ''
    let details: unknown = null
    try {
      const body = (await res.json()) as Partial<ApiErrorBody>
      if (typeof body?.error?.code === 'string') code = body.error.code
      if (typeof body?.error?.message === 'string') apiMessage = body.error.message
      details = body?.error?.details ?? null
    } catch {
      /* sin cuerpo JSON */
    }
    throw new ApiError(
      res.status,
      MESSAGES[code] ?? (apiMessage || `Error ${res.status} del servidor.`),
      code,
      details,
    )
  }
  if (res.status === 204) return undefined as T // DELETE sin cuerpo
  return (await res.json()) as T
}

const wait = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 250))

export const api = {
  /**
   * Garantiza que el usuario tenga perfil antes de crear o listar parcelas
   * (sin perfil, crear una parcela responde 404 profile_not_found).
   * POST /api/users/me actualiza el nombre si ya existe, así que primero se consulta
   * con GET y solo se crea cuando la API responde profile_not_found.
   */
  ensureProfile: async (displayName: string): Promise<void> => {
    if (USE_MOCKS) return
    try {
      await request<UserProfile>('/api/users/me')
    } catch (e) {
      if (!(e instanceof ApiError) || e.code !== 'profile_not_found') throw e
      await request<UserProfile>('/api/users/me', {
        method: 'POST',
        body: JSON.stringify({ display_name: displayName }),
      })
    }
  },

  listPlots: (): Promise<Plot[]> =>
    USE_MOCKS ? wait(mockPlots) : request<Plot[]>('/api/plots'),

  createPlot: (input: PlotInput): Promise<Plot> =>
    USE_MOCKS
      ? wait(mockCreatePlot(input))
      : request<Plot>('/api/plots', { method: 'POST', body: JSON.stringify(input) }),

  getPlot: (plotId: string): Promise<Plot> =>
    USE_MOCKS ? wait(mockGetPlot(plotId)) : request<Plot>(`/api/plots/${plotId}`),

  /** Guarda solo los campos enviados y devuelve la parcela completa. null borra un campo opcional. */
  updatePlot: (plotId: string, patch: PlotUpdate): Promise<Plot> =>
    USE_MOCKS
      ? wait(mockUpdatePlot(plotId, patch))
      : request<Plot>(`/api/plots/${plotId}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  /** Cultivo anterior (previous), actual (current) y próxima campaña (planned), más el historial. */
  getCropCycles: (plotId: string): Promise<CropCyclesResponse> =>
    USE_MOCKS ? wait(mockCropCycles(plotId)) : request<CropCyclesResponse>(`/api/plots/${plotId}/crop-cycles`),

  /** 201. Con 409 (active_cycle_exists / planned_cycle_exists) `details.cycle_id` es el ciclo a corregir con PATCH. */
  createCropCycle: (plotId: string, body: CropCycleCreate): Promise<CropCycle> =>
    USE_MOCKS
      ? wait(null).then(() => mockCreateCropCycle(plotId, body))
      : request<CropCycle>(`/api/plots/${plotId}/crop-cycles`, { method: 'POST', body: JSON.stringify(body) }),

  /** Corrige un ciclo por su id: solo los campos enviados. */
  updateCropCycle: (plotId: string, cycleId: string, body: CropCycleUpdate): Promise<CropCycle> =>
    USE_MOCKS
      ? wait(null).then(() => mockUpdateCropCycle(plotId, cycleId, body))
      : request<CropCycle>(`/api/plots/${plotId}/crop-cycles/${cycleId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),

  /** 204 sin cuerpo. */
  deleteCropCycle: (plotId: string, cycleId: string): Promise<void> =>
    USE_MOCKS
      ? wait(null).then(() => mockDeleteCropCycle(plotId, cycleId))
      : request<void>(`/api/plots/${plotId}/crop-cycles/${cycleId}`, { method: 'DELETE' }),

  /** Catálogo público (no necesita token). */
  listCrops: (): Promise<Crop[]> =>
    USE_MOCKS ? wait(mockCrops) : request<Crop[]>('/api/crops'),

  /** Orden ascendente por recorded_at. */
  getReadings: (plotId: string): Promise<SensorReading[]> =>
    USE_MOCKS
      ? wait(mockReadings())
      : request<SensorReading[]>(`/api/plots/${plotId}/sensors/readings`),

  /**
   * Observaciones guardadas de UNA variable en un rango (from y to, AAAA-MM-DD, hora solar local de POWER).
   * Nunca se piden todas las variables ni sin fechas: con 10 años serían unas 36 000 filas.
   */
  getNasaObservations: (
    plotId: string,
    range: { from: string; to: string },
    variable: NasaVariable,
  ): Promise<NasaObservation[]> =>
    USE_MOCKS
      ? wait(mockNasa(range, variable))
      : request<NasaObservation[]>(
          `/api/plots/${plotId}/nasa/observations?variable=${variable}&from=${range.from}&to=${range.to}`,
        ),

  /** Pide a la API consultar POWER (últimos 90 días) y guardarlo. Luego se leen las observaciones. */
  refreshNasaPower: (plotId: string): Promise<NasaImportResult | null> => {
    if (USE_MOCKS) {
      if (MOCK_SCENARIO === 'nasa_down') {
        return new Promise((_, reject) =>
          setTimeout(
            () => reject(new ApiError(503, MESSAGES.nasa_power_unavailable, 'nasa_power_unavailable')),
            250,
          ),
        )
      }
      return wait(null)
    }
    return request<NasaImportResult>(`/api/plots/${plotId}/nasa/power`, { method: 'POST', body: '{}' })
  },

  /**
   * PENDIENTE BACKEND: POST /api/recommendations todavía no tiene ruta (propuesta del PR #7).
   * Por defecto usa mocks (DATOS DE EJEMPLO). Cuando exista la ruta: VITE_RECOMMENDATIONS_SOURCE=api
   * y VITE_USE_MOCKS=false, sin tocar código.
   */
  createRecommendation: (req: RecommendationRequest): Promise<RecommendationResponse> =>
    RECOMMENDATIONS_ARE_MOCK
      ? wait(mockRecommendation(req))
      : request<RecommendationResponse>('/api/recommendations', {
          method: 'POST',
          body: JSON.stringify(req),
        }),
}
