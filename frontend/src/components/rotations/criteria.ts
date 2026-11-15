import type { Criteria, CriterionScore } from '../../types/api'
import { formatNumber } from '../../utils/format'

/** Nombres de los criterios del prototipo. Un id desconocido se muestra tal cual. */
const LABELS: Record<string, string> = {
  clima: 'Clima',
  agua: 'Agua',
  suelo: 'Suelo',
  diversificacion: 'Diversificación',
}

export const criterionLabel = (id: string): string => LABELS[id] ?? id

/** Peso (0 a 1) como porcentaje: 0.4 → «40 %». */
export const weightPct = (w: number): string => `${formatNumber(w * 100, 0)} %`

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Un criterio válido tiene puntaje, peso y aporte numéricos. */
export const isValidCriterion = (c: CriterionScore | undefined): c is CriterionScore =>
  !!c && isNum(c.score) && isNum(c.weight) && isNum(c.contribution)

/** true si la alternativa trae un desglose (lista) con al menos un criterio válido. */
export function hasCriteria(criteria: Criteria | undefined): criteria is Criteria {
  return Array.isArray(criteria) && criteria.some(isValidCriterion)
}

/**
 * ¿La suma de los aportes coincide con el puntaje total? El contrato dice que sí, salvo redondeo
 * (el total es entero y los aportes tienen 2 decimales: se tolera medio punto).
 * Si no coincide no se corrige nada: se muestran los valores de la API y se avisa.
 */
export function contributionsSum(criteria: Criteria): number {
  return criteria.filter(isValidCriterion).reduce((acc, c) => acc + c.contribution, 0)
}
export const sumMatches = (sum: number, total: number): boolean => Math.abs(sum - total) <= 0.5 + 1e-9

export interface WeightChange {
  id: string
  label: string
  from: number
  to: number
}

/** Criterios cuyo peso cambió entre dos respuestas (por ejemplo, al cambiar la prioridad). */
export function weightChanges(before: Criteria | undefined, after: Criteria | undefined): WeightChange[] {
  if (!Array.isArray(before) || !Array.isArray(after)) return []
  const out: WeightChange[] = []
  for (const c of after) {
    const prev = before.find((b) => b.id === c.id)
    if (isValidCriterion(c) && isValidCriterion(prev) && Math.abs(prev.weight - c.weight) >= 0.005) {
      out.push({ id: c.id, label: criterionLabel(c.id), from: prev.weight, to: c.weight })
    }
  }
  return out
}
