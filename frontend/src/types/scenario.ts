import type { Alternative, Priority, RecommendationContext, RecommendationResponse } from './api'

/** "reference" = referencia proyectada (no es mejor ni peor); "alternative" = alternativa para comparar. */
export type ScenarioRole = 'reference' | 'alternative'

/** Una estrategia de `demo.estrategias` (se une con `response.alternatives` por `id`). */
export interface DemoStrategy {
  id: string
  /** "referencia" | "alternativa". */
  rol: string
  nombre: string
  descripcion?: string
}

/** Bloque `demo` de los archivos que entrega Rodrigo (backend/docs/demo-rotaciones-valle-chira.md). */
export interface DemoMeta {
  tipo?: string
  aviso?: string
  reference_id?: string | null
  estrategias?: DemoStrategy[]
  supuestos?: { textura?: string; fechas?: string }
  /** Textos que declaran qué es sintético y qué es real. */
  sintetico?: { puntuaciones?: string; requisitos_cultivo?: string; clima?: string }
  comando?: string
}

/** Forma de cada archivo `demo-rotaciones-valle-chira-<prioridad>.json`: `demo` más la respuesta normal de la API. */
export interface DemoFile {
  demo?: DemoMeta
  request?: { plot_id: string; priority: Priority; horizon_days: number }
  http_status?: number
  /** RecommendationResponse (el mismo contrato de POST /api/recommendations). */
  response: RecommendationResponse
}

/** Una tarjeta del escenario: la estrategia unida con su alternativa por `id`. */
export interface ScenarioCardModel {
  id: string
  role: ScenarioRole
  nombre: string
  descripcion?: string
  /** campaigns, reasons, limitations, sources y, solo como datos de prueba, score y criteria. */
  alt: Alternative
}

/** Lo que muestra la vista del escenario. El orden de `cards` es el de `demo.estrategias` (no el de rank ni score). */
export interface ScenarioModel {
  priority: Priority | null
  aviso: string
  cards: ScenarioCardModel[]
  supuestos: { textura?: string; fechas?: string }
  assumptions: NonNullable<RecommendationContext['assumptions']>
  sintetico: { puntuaciones?: string; requisitos_cultivo?: string; clima?: string }
  context: RecommendationContext | null
  createdAt?: string
}
