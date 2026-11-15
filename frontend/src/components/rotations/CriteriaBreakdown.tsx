import type { Criteria } from '../../types/api'
import { formatNumber } from '../../utils/format'
import { Eyebrow } from '../ui/Eyebrow'
import { SourceBadge } from '../ui/SourceBadge'
import {
  contributionsSum,
  criterionLabel,
  hasCriteria,
  isValidCriterion,
  sumMatches,
  weightChanges,
  weightPct,
} from './criteria'

/**
 * Desglose por criterio de una alternativa: una barra por criterio (en el orden que manda la API:
 * clima, agua, suelo, diversificación) con su puntaje (0 a 100), el peso en el total y su aporte.
 * Si no viene `criteria`, no se muestra. Con `previous` (los criterios de la misma alternativa con la otra
 * prioridad) se resalta qué criterios cambiaron de peso, para ver la compensación.
 * Los valores son los de la API: si la suma de los aportes no coincide con el total, se avisa y no se corrige.
 */
export function CriteriaBreakdown({
  criteria,
  total,
  previous,
  selected,
  example = false,
}: {
  criteria: Criteria | undefined
  /** Puntaje total de la alternativa (0 a 100). */
  total: number
  previous?: Criteria
  selected: boolean
  /** true = los datos son de ejemplo. */
  example?: boolean
}) {
  if (!hasCriteria(criteria)) return null
  const changed = new Map(weightChanges(previous, criteria).map((c) => [c.id, c]))
  const sum = contributionsSum(criteria)
  const matches = sumMatches(sum, total)

  return (
    <div className="mt-6 border-t border-line pt-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Eyebrow>Desglose por criterio</Eyebrow>
        {example && <SourceBadge kind="prototype" label="Datos de ejemplo" />}
      </div>
      <ul className="space-y-4">
        {criteria.map((c) => {
          const ok = isValidCriterion(c)
          const ch = changed.get(c.id)
          return (
            <li key={c.id} className={ch ? 'border-l-2 border-lima pl-3' : ''}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="font-medium text-ink">{criterionLabel(c.id)}</span>
                {ok ? (
                  <span className="font-mono text-base text-ink">
                    {formatNumber(c.score, 0)}
                    <span className="text-muted"> / 100 · pesa {weightPct(c.weight)}</span>
                  </span>
                ) : (
                  <span className="font-mono text-base text-muted">Sin dato</span>
                )}
              </div>
              <div
                role="meter"
                aria-label={`${criterionLabel(c.id)}: puntaje del prototipo`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={ok ? Math.round(c.score) : undefined}
                className="mt-1 h-2 w-full bg-track"
              >
                {ok && (
                  <div
                    className={`h-full ${selected ? 'bg-lima' : 'bg-muted'}`}
                    style={{ width: `${Math.max(0, Math.min(100, c.score))}%` }}
                  />
                )}
              </div>
              {ok && (
                <p className="mt-1 font-mono text-base text-muted">
                  Aporta <span className="text-ink">{formatNumber(c.contribution, 1)}</span> puntos al total
                </p>
              )}
              {ch && (
                <p className="mt-1 font-mono text-base text-lima">
                  {ch.to > ch.from ? '▲' : '▼'} El peso cambió: {weightPct(ch.from)} → {weightPct(ch.to)}
                </p>
              )}
            </li>
          )
        })}
      </ul>
      <p className="mt-4 font-mono text-base text-muted">
        Suma de los aportes: {formatNumber(sum, 1)} · Puntaje total: {formatNumber(total, 0)}
        {!matches && ' · No coinciden: mostramos los valores tal como llegan de la API.'}
      </p>
      <p className="mt-2 text-muted">
        Cada barra es un criterio del prototipo. El total pondera los cuatro según tu prioridad; no es una
        probabilidad de éxito.
      </p>
    </div>
  )
}
