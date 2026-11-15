import type { Alternative, Priority } from '../types/api'
import type { DemoFile, ScenarioCardModel, ScenarioModel, ScenarioRole } from '../types/scenario'

const DEFAULT_AVISO = 'Escenario de demostración. No es una recomendación validada para la parcela.'

const isCampaign = (c: unknown): boolean =>
  !!c &&
  typeof (c as { crop?: unknown }).crop === 'string' &&
  typeof (c as { starts_on?: unknown }).starts_on === 'string' &&
  typeof (c as { ends_on?: unknown }).ends_on === 'string'

const isUsable = (a: Alternative | undefined): a is Alternative =>
  !!a && typeof a.id === 'string' && Array.isArray(a.campaigns) && a.campaigns.length > 0 && a.campaigns.every(isCampaign)

/**
 * Convierte un archivo del escenario (o la respuesta de la API con esa misma forma) en lo que muestra la pantalla.
 * - Une `demo.estrategias` con `response.alternatives` por `id`, y deja las tarjetas en el orden de `demo.estrategias`
 *   (nunca por rank ni por score; `selected_id` se ignora).
 * - Si no hay `demo.estrategias` o la API no trae `role`, todas las alternativas se tratan como alternativas,
 *   en el orden en que llegan, rotuladas «Alternativa A», «B»…
 * Lanza un error si no hay ninguna alternativa utilizable.
 */
export function buildScenario(file: DemoFile, priority: Priority | null = null): ScenarioModel {
  const resp = file.response
  const alts = (resp?.alternatives ?? []).filter(isUsable)
  if (alts.length === 0) throw new Error('El escenario no trae alternativas.')
  const byId = new Map(alts.map((a) => [a.id, a]))
  const meta = file.demo ?? {}

  const cards: ScenarioCardModel[] = []
  const used = new Set<string>()
  for (const s of meta.estrategias ?? []) {
    const alt = byId.get(s.id)
    if (!alt || used.has(s.id)) continue
    used.add(s.id)
    const role: ScenarioRole = s.rol === 'referencia' || meta.reference_id === s.id ? 'reference' : 'alternative'
    cards.push({ id: s.id, role, nombre: s.nombre, descripcion: s.descripcion, alt })
  }
  // Alternativas sin estrategia (o sin `demo`): alternativas, en el orden en que llegan.
  let letter = cards.filter((c) => c.role === 'alternative').length
  for (const alt of alts) {
    if (used.has(alt.id)) continue
    cards.push({ id: alt.id, role: 'alternative', nombre: `Alternativa ${String.fromCharCode(65 + letter++)}`, alt })
  }

  return {
    priority,
    aviso: meta.aviso ?? DEFAULT_AVISO,
    cards,
    supuestos: meta.supuestos ?? {},
    assumptions: resp.context?.assumptions ?? [],
    sintetico: meta.sintetico ?? {},
    context: resp.context ?? null,
    createdAt: resp.created_at,
  }
}
