import type { Criteria, CriterionId, CriterionScore } from '../../types/api'
import { formatNumber } from '../../utils/format'
import { tr } from '../../i18n/active'

/** Los cuatro criterios del prototipo, en el orden en que se muestran. */
export const CRITERIA: { id: CriterionId; label: string }[] = [
  {
    id: 'clima',
    get label() {
      return tr('criteria.clima')
    },
  },
  {
    id: 'agua',
    get label() {
      return tr('criteria.agua')
    },
  },
  {
    id: 'suelo',
    get label() {
      return tr('criteria.suelo')
    },
  },
  {
    id: 'diversificacion',
    get label() {
      return tr('criteria.diversificacion')
    },
  },
]

/** Peso (0 a 1) como porcentaje: 0.4 → «40 %». */
export const weightPct = (w: number): string => `${formatNumber(w * 100, 0)} %`

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Un criterio válido tiene puntaje, peso y aporte numéricos. */
export const isValidCriterion = (c: CriterionScore | undefined): c is CriterionScore =>
  !!c && isNum(c.score) && isNum(c.weight) && isNum(c.contribution)

/** true si la alternativa trae un desglose (objeto) con al menos un criterio válido. `{}` o ausente: no se muestra. */
export function hasCriteria(criteria: Criteria | undefined): criteria is Criteria {
  return !!criteria && typeof criteria === 'object' && !Array.isArray(criteria) && CRITERIA.some((c) => isValidCriterion(criteria[c.id]))
}

/**
 * Suma de los aportes de los criterios válidos. El contrato dice que coincide con el puntaje total salvo redondeo
 * (el total es entero y los aportes tienen 2 decimales: se tolera medio punto). Si no coincide no se corrige nada:
 * se muestran los valores de la API y se avisa.
 */
export function contributionsSum(criteria: Criteria): number {
  return CRITERIA.reduce((acc, c) => {
    const x = criteria[c.id]
    return acc + (isValidCriterion(x) ? x.contribution : 0)
  }, 0)
}
export const sumMatches = (sum: number, total: number): boolean => Math.abs(sum - total) <= 0.5 + 1e-9

export interface WeightChange {
  id: CriterionId
  label: string
  from: number
  to: number
}

/** Criterios cuyo peso cambió entre dos respuestas (por ejemplo, al cambiar la prioridad). */
export function weightChanges(before: Criteria | undefined, after: Criteria | undefined): WeightChange[] {
  if (!before || !after) return []
  const out: WeightChange[] = []
  for (const c of CRITERIA) {
    const a = before[c.id]
    const b = after[c.id]
    if (isValidCriterion(a) && isValidCriterion(b) && Math.abs(a.weight - b.weight) >= 0.005) {
      out.push({ id: c.id, label: c.label, from: a.weight, to: b.weight })
    }
  }
  return out
}
