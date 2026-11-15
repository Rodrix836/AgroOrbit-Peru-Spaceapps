import { ESCENARIO_VALLE_CHIRA } from '../data/escenario-valle-chira'
import type { Alternative, Campaign } from '../types/api'
import type { Scenario, ScenarioAlternative, ScenarioRole } from '../types/scenario'

/** Respuesta de la API para el escenario (PENDIENTE BACKEND: forma tomada de RecommendationResponse). */
export interface ScenarioApiResponse {
  alternatives?: (Partial<Alternative> & { role?: ScenarioRole })[]
  /** Propuesta de Milene: id de la alternativa que es la referencia proyectada (o null). */
  reference_id?: string | null
}

const isCampaign = (c: unknown): c is Campaign =>
  !!c &&
  typeof (c as Campaign).crop === 'string' &&
  typeof (c as Campaign).starts_on === 'string' &&
  typeof (c as Campaign).ends_on === 'string'

/**
 * Convierte la respuesta de la API en el escenario que muestra la pantalla. Si la API no trae `role` (ni `reference_id`),
 * todas son alternativas. La referencia va primero; después, las demás en el orden de la API. Los textos que la API no
 * trae (aviso, supuestos, lectura comparativa, textos al agricultor) salen de la constante estática.
 * Lanza un error si la respuesta no trae ninguna alternativa utilizable.
 */
export function scenarioFromApi(resp: ScenarioApiResponse, base: Scenario = ESCENARIO_VALLE_CHIRA): Scenario {
  const raw = (resp.alternatives ?? []).filter(
    (a) => typeof a.id === 'string' && Array.isArray(a.campaigns) && a.campaigns.length > 0 && a.campaigns.every(isCampaign),
  )
  if (raw.length === 0) throw new Error('La API no trajo alternativas para el escenario.')

  const withRole = raw.map((a) => {
    const role: ScenarioRole = a.role ?? (resp.reference_id && resp.reference_id === a.id ? 'reference' : 'alternative')
    return { a, role }
  })
  const ordered = [...withRole.filter((x) => x.role === 'reference'), ...withRole.filter((x) => x.role !== 'reference')]

  let letter = 0
  const alternatives: ScenarioAlternative[] = ordered.map(({ a, role }) => ({
    id: a.id as string,
    role,
    label: role === 'reference' ? 'Referencia proyectada' : `Alternativa ${String.fromCharCode(65 + letter++)}`,
    // Si algún día vienen, se muestran solo como «Puntajes de prueba (sintéticos)».
    ...(typeof a.rank === 'number' ? { rank: a.rank } : {}),
    ...(typeof a.score === 'number' ? { score: a.score } : {}),
    ...(a.criteria ? { criteria: a.criteria } : {}),
    campaigns: a.campaigns as Campaign[],
    reasons: a.reasons ?? [],
    limitations: a.limitations ?? [],
    sources: a.sources ?? [],
  }))

  return { ...base, alternatives }
}
