import type { Criteria } from '../../types/api'
import { formatNumber } from '../../utils/format'
import { Eyebrow } from '../ui/Eyebrow'
import { SourceBadge } from '../ui/SourceBadge'
import {
  CRITERIA,
  contributionsSum,
  hasCriteria,
  isValidCriterion,
  sumMatches,
  weightChanges,
  weightPct,
} from './criteria'
import { useLanguage } from '../../i18n/LanguageContext'

/**
 * Desglose por criterio de una alternativa: una barra por criterio (clima, agua, suelo, diversificación) con su puntaje (0 a 100), el peso en el total y su aporte.
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
  const { t } = useLanguage()
  if (!hasCriteria(criteria)) return null
  const changed = new Map(weightChanges(previous, criteria).map((c) => [c.id, c]))
  const sum = contributionsSum(criteria)
  const matches = sumMatches(sum, total)

  return (
    <div className="mt-6 border-t border-line pt-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Eyebrow>{t('cb.title')}</Eyebrow>
        {example && <SourceBadge kind="prototype" label={t('common.exampleData')} />}
      </div>
      <ul className="space-y-4">
        {CRITERIA.map((def) => {
          const c = criteria[def.id]
          const ok = isValidCriterion(c)
          const ch = changed.get(def.id)
          return (
            <li key={def.id} className={ch ? 'border-l-2 border-lima pl-3' : ''}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="font-medium text-ink">{def.label}</span>
                {ok ? (
                  <span className="font-mono text-base text-ink">
                    {formatNumber(c.score, 0)}
                    <span className="text-muted">{t('cb.scoreWeight', { weight: weightPct(c.weight) })}</span>
                  </span>
                ) : (
                  <span className="font-mono text-base text-muted">{t('common.noData')}</span>
                )}
              </div>
              <div
                role="meter"
                aria-label={t('cb.meterLabel', { criterion: def.label })}
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
                  {t('cb.contributes', { points: formatNumber(c.contribution, 1) })}
                </p>
              )}
              {ch && (
                <p className="mt-1 font-mono text-base text-lima">
                  {ch.to > ch.from ? '▲' : '▼'} {t('cb.weightChanged', { from: weightPct(ch.from), to: weightPct(ch.to) })}
                </p>
              )}
            </li>
          )
        })}
      </ul>
      <p className="mt-4 font-mono text-base text-muted">
        {t('cb.sum', { sum: formatNumber(sum, 1), total: formatNumber(total, 0) })}
        {!matches && t('cb.mismatch')}
      </p>
      <p className="mt-2 text-muted">
        {t('cb.note')}
      </p>
    </div>
  )
}
