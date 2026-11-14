// Cliente de FastAPI: ÚNICO punto de acceso a datos del frontend.
import type {
  Crop,
  NasaObservation,
  Plot,
  PlotInput,
  RecommendationRequest,
  RecommendationResponse,
  SensorReading,
} from '../types/api'
import { supabase } from './supabase'
import {
  mockCrops,
  mockNasa,
  mockPlots,
  mockReadings,
  mockRecommendation,
} from './mocks'

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'
const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
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
    throw new ApiError(0, 'No se pudo conectar con el servidor.')
  }
  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = typeof body?.detail === 'string' ? body.detail : ''
    } catch {
      /* sin cuerpo JSON */
    }
    throw new ApiError(res.status, detail || `Error ${res.status} del servidor.`)
  }
  return (await res.json()) as T
}

const wait = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 250))

export const api = {
  listPlots: (): Promise<Plot[]> =>
    USE_MOCKS ? wait(mockPlots) : request<Plot[]>('/api/plots'),

  createPlot: (input: PlotInput): Promise<Plot> =>
    USE_MOCKS
      ? wait({ id: 'ejemplo-1', ...input })
      : request<Plot>('/api/plots', { method: 'POST', body: JSON.stringify(input) }),

  listCrops: (): Promise<Crop[]> =>
    USE_MOCKS ? wait(mockCrops) : request<Crop[]>('/api/crops'),

  getReadings: (plotId: string): Promise<SensorReading[]> =>
    USE_MOCKS
      ? wait(mockReadings())
      : request<SensorReading[]>(`/api/plots/${plotId}/sensors/readings`),

  getNasaObservations: (plotId: string): Promise<NasaObservation[]> =>
    USE_MOCKS
      ? wait(mockNasa())
      : request<NasaObservation[]>(`/api/plots/${plotId}/nasa/observations`),

  /** Pide a la API consultar y guardar POWER; luego se leen las observaciones. */
  refreshNasaPower: (plotId: string): Promise<unknown> =>
    USE_MOCKS
      ? wait(null)
      : request<unknown>(`/api/plots/${plotId}/nasa/power`, { method: 'POST', body: '{}' }),

  /** PENDIENTE en backend: POST /api/recommendations (ver types/api.ts). */
  createRecommendation: (req: RecommendationRequest): Promise<RecommendationResponse> =>
    USE_MOCKS
      ? wait(mockRecommendation(req))
      : request<RecommendationResponse>('/api/recommendations', {
          method: 'POST',
          body: JSON.stringify(req),
        }),
}
