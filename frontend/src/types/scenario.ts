import type { Campaign, Criteria, SourceRef } from './api'

/** "reference" = referencia proyectada (no es mejor ni peor); "alternative" = alternativa para comparar. */
export type ScenarioRole = 'reference' | 'alternative'

/**
 * Una secuencia de dos campañas del escenario de demostración. Misma forma que `alternatives[]` del contrato de
 * POST /api/recommendations (campaigns, reasons, limitations, sources) más un `role` opcional. El escenario de
 * Milene es cualitativo: no trae ranking ni puntajes, así que `rank`, `score` y `criteria` son opcionales.
 */
export interface ScenarioAlternative {
  id: string
  /** Opcional. Si la API no trae `role`, todas se tratan como alternativas. */
  role?: ScenarioRole
  /** Rótulo de la tarjeta: «Referencia proyectada», «Alternativa A»… (opcional: si falta se deduce del orden). */
  label?: string
  /** Solo si algún día la API los trae: se muestran únicamente como «Puntajes de prueba (sintéticos)». */
  rank?: number
  score?: number
  criteria?: Criteria
  /** Ids de GET /api/crops, con fechas de inicio y fin (AAAA-MM-DD). */
  campaigns: Campaign[]
  /** «Qué se puede comparar» (columna «Posible ventaja a evaluar»). */
  reasons: string[]
  /** «Principal riesgo». */
  limitations: string[]
  sources: SourceRef[]
  /** Nota breve bajo el título (opcional). */
  note?: string
}

/** Bloque de «Lectura comparativa sin puntuaciones»: un texto con sus fuentes. */
export interface ScenarioReading {
  title: string
  text: string
  sources: SourceRef[]
}

/** Contenido completo del escenario de demostración. */
export interface Scenario {
  /** Aviso ámbar de arriba. */
  notice: string
  /** Etiquetas visibles junto a la comparación. */
  tags: string[]
  /** Supuestos del escenario. */
  assumptions: string[]
  alternatives: ScenarioAlternative[]
  comparativeReading: ScenarioReading[]
  /** Textos para el agricultor. */
  farmerTexts: string[]
}
