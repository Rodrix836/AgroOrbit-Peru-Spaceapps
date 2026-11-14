// Cliente de FastAPI: ÚNICO punto de acceso a datos del frontend.
// Contrato: backend/docs/api-contract.md (fuente de verdad).
import type {
  ApiErrorBody,
  Crop,
  NasaImportResult,
  NasaObservation,
  Plot,
  PlotInput,
  RecommendationRequest,
  RecommendationResponse,
  SensorReading,
  UserProfile,
} from '../types/api'
import { supabase } from './supabase'
import {
  MOCK_SCENARIO,
  mockCreatePlot,
  mockCrops,
  mockNasa,
  mockPlots,
  mockReadings,
  mockRecommendation,
} from './mocks'

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'
const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

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
  validation_error: 'Algunos datos no son válidos. Revisa los campos e inténtalo de nuevo.',
  invalid_date_range: 'El rango de fechas no es válido.',
  network_error: 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.',
}

export class ApiError extends Error {
  status: number
  /** Código estable de la API (`error.code`), o `network_error` si no hubo respuesta. */
  code: string
  constructor(status: number, message: string, code = 'unknown') {
    super(message)
    this.status = status
    this.code = code
  }
}

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
    try {
      const body = (await res.json()) as Partial<ApiErrorBody>
      if (typeof body?.error?.code === 'string') code = body.error.code
      if (typeof body?.error?.message === 'string') apiMessage = body.error.message
    } catch {
      /* sin cuerpo JSON */
    }
    throw new ApiError(res.status, MESSAGES[code] ?? (apiMessage || `Error ${res.status} del servidor.`), code)
  }
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

  /** PENDIENTE BACKEND: GET /api/crops no existe todavía. Siempre usa mocks (DATOS DE EJEMPLO). */
  listCrops: (): Promise<Crop[]> => wait(mockCrops),

  /** Orden ascendente por recorded_at. */
  getReadings: (plotId: string): Promise<SensorReading[]> =>
    USE_MOCKS
      ? wait(mockReadings())
      : request<SensorReading[]>(`/api/plots/${plotId}/sensors/readings`),

  getNasaObservations: (plotId: string): Promise<NasaObservation[]> =>
    USE_MOCKS
      ? wait(mockNasa())
      : request<NasaObservation[]>(`/api/plots/${plotId}/nasa/observations`),

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
   * PENDIENTE BACKEND: POST /api/recommendations no existe todavía.
   * Siempre usa mocks (DATOS DE EJEMPLO), aunque VITE_USE_MOCKS sea false.
   */
  createRecommendation: (req: RecommendationRequest): Promise<RecommendationResponse> =>
    wait(mockRecommendation(req)),
}
