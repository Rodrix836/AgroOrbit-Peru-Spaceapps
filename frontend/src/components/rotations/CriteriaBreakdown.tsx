import type { Criteria } from '../../types/api'
import { Eyebrow } from '../ui/Eyebrow'
import { SourceBadge } from '../ui/SourceBadge'
import { CRITERIA, hasCriteria, weightChanges, weightPct } from './criteria'

/**
 * Desglose por criterio de una alternativa: cuatro barras (Clima, Agua, Suelo, Diversificación)
 * con su puntaje (0 a 100) y el peso que tiene en el total. Si no viene `criteria`, no se muestra.
 * Con `previous` (los criterios de la misma alternativa con la otra prioridad) se resalta
 * qué criterios cambiaron de peso, para ver la compensación.
 */
export function CriteriaBreakdown({
  criteria,
  previous,
  selected,
  example = false,
}: {
  criteria: Criteria | undefined
  previous?: Criteria
  selected: boolean
  /** true = los datos son de ejemplo (la API aún no devuelve el desglose). */
  example?: boolean
}) {
  if (!hasCriteria(criteria)) return null
  const changed = new Map(weightChanges(previous, criteria).map((c) => [c.id, c]))

  return (
    <div className="mt-6 border-t border-line pt-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Eyebrow>Desglose por criterio</Eyebrow>
        {example && <SourceBadge kind="prototype" label="Datos de ejemplo" />}
      </div>
      <ul className="space-y-4">
        {CRITERIA.map((c) => {
          const x = criteria[c.id]
          const hasData = typeof x?.score === 'number' && typeof x?.weight === 'number'
          const ch = changed.get(c.id)
          return (
            <li key={c.id} className={ch ? 'border-l-2 border-lima pl-3' : 'pl-0'}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="font-medium text-ink">{c.label}</span>
                {hasData ? (
                  <span className="font-mono text-base text-ink">
                    {Math.round(x.score)}
                    <span className="text-muted"> / 100 · pesa {weightPct(x.weight)}</span>
                  </span>
                ) : (
                  <span className="font-mono text-base text-muted">Sin dato</span>
                )}
              </div>
              <div
                role="meter"
                aria-label={`${c.label}: puntaje del prototipo`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={hasData ? Math.round(x.score) : undefined}
                className="mt-1 h-2 w-full bg-track"
              >
                {hasData && (
                  <div
                    className={`h-full ${selected ? 'bg-lima' : 'bg-muted'}`}
                    style={{ width: `${Math.max(0, Math.min(100, x.score))}%` }}
                  />
                )}
              </div>
              {ch && (
                <p className="mt-1 font-mono text-base text-lima">
                  {ch.to > ch.from ? '▲' : '▼'} El peso cambió: {weightPct(ch.from)} → {weightPct(ch.to)}
                </p>
              )}
            </li>
          )
        })}
      </ul>
      <p className="mt-4 text-muted">
        Cada barra es un criterio del prototipo. El total pondera los cuatro según tu prioridad; no es una
        probabilidad de éxito.
      </p>
    </div>
  )
}
