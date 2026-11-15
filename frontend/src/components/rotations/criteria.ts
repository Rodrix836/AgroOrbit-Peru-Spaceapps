import type { Criteria, CriterionId } from '../../types/api'
import { formatNumber } from '../../utils/format'

/** Los cuatro criterios del prototipo, en el orden en que se muestran. */
export const CRITERIA: { id: CriterionId; label: string }[] = [
  { id: 'clima', label: 'Clima' },
  { id: 'agua', label: 'Agua' },
  { id: 'suelo', label: 'Suelo' },
  { id: 'diversificacion', label: 'Diversificación' },
]

/** Peso (0 a 1) como porcentaje: 0.4 → «40 %». */
export const weightPct = (w: number): string => `${formatNumber(w * 100, 0)} %`

/** true si la alternativa trae al menos un criterio con puntaje y peso numéricos. */
export function hasCriteria(criteria: Criteria | undefined): criteria is Criteria {
  return CRITERIA.some((c) => {
    const x = criteria?.[c.id]
    return typeof x?.score === 'number' && typeof x?.weight === 'number'
  })
}

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
    const a = before[c.id]?.weight
    const b = after[c.id]?.weight
    if (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) >= 0.005) {
      out.push({ id: c.id, label: c.label, from: a, to: b })
    }
  }
  return out
}
