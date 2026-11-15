import type { Crop } from '../../types/api'
import type { ScenarioAlternative } from '../../types/scenario'
import { formatDay, formatNumber } from '../../utils/format'
import { daysBetween } from '../../utils/period'
import { Eyebrow } from '../ui/Eyebrow'
import { CampaignCalendar } from './CampaignCalendar'
import { CriteriaBreakdown } from './CriteriaBreakdown'
import { hasCriteria } from './criteria'
import { cropName } from './labels'
import { SourcesList } from './SourcesList'

/**
 * Una secuencia de dos campañas del escenario de demostración: campañas con fechas y días, calendario, «Qué se puede
 * comparar», «Principal riesgo» y fuentes. Sin puntajes, barras ni «mejor puntaje»: el escenario es cualitativo.
 * La referencia se distingue con borde neutro y rótulo, sin presentarla como mejor ni peor.
 */
export function ScenarioCard({
  alt,
  fallbackLabel,
  crops,
}: {
  alt: ScenarioAlternative
  /** Rótulo si la alternativa no trae `label` (p. ex. «Alternativa A»). */
  fallbackLabel: string
  crops: Crop[]
}) {
  const reference = alt.role === 'reference'
  const label = alt.label ?? (reference ? 'Referencia proyectada' : fallbackLabel)
  const named = alt.campaigns.map((c) => ({ ...c, crop: cropName(c.crop, crops) }))
  const sequence = named.map((c) => c.crop).join(' → ')

  const first = alt.campaigns[0]
  const last = alt.campaigns[alt.campaigns.length - 1]
  const totalDays = first && last ? daysBetween(first.starts_on, last.ends_on) : null

  // Solo si algún día la API los trae: se muestran únicamente como puntajes de prueba.
  const testScores = typeof alt.score === 'number' || hasCriteria(alt.criteria)

  return (
    <article className={`min-w-0 bg-panel p-6 md:p-8 ${reference ? 'border-2 border-edge' : 'border-2 border-transparent'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Eyebrow tone={reference ? 'muted' : 'cielo'}>{label}</Eyebrow>
        {reference && (
          <span className="border border-edge px-2 py-0.5 font-mono text-[13px] uppercase tracking-[0.12em] text-muted">
            Punto de comparación
          </span>
        )}
      </div>

      <h3 className="mt-3 font-display text-[clamp(26px,4vw,36px)] font-extrabold leading-none tracking-[-0.03em] text-ink">
        {sequence || 'Sin secuencia'}
      </h3>
      {alt.note && <p className="mt-3 text-muted">{alt.note}</p>}

      <Eyebrow className="mb-3 mt-6">Las dos campañas</Eyebrow>
      <ol className="space-y-3">
        {named.map((c, i) => (
          <li key={i} className="border-l-2 border-edge pl-3">
            <p className="font-medium text-ink">
              Campaña {i + 1} · {c.crop}
            </p>
            <p className="font-mono text-base text-ink">
              {formatDay(c.starts_on)} a {formatDay(c.ends_on)}
            </p>
            <p className="font-mono text-base text-muted">{daysBetween(c.starts_on, c.ends_on)} días</p>
          </li>
        ))}
      </ol>
      {totalDays !== null && (
        <p className="mt-3 font-mono text-base text-ink">
          Total: <span className="font-medium">{totalDays} días</span>
        </p>
      )}

      <Eyebrow className="mb-3 mt-6">Calendario · fechas ilustrativas</Eyebrow>
      <CampaignCalendar campaigns={named} showList={false} />

      <Eyebrow tone="lima" className="mb-3 mt-6">
        Qué se puede comparar
      </Eyebrow>
      <ul className="space-y-2">
        {alt.reasons.map((r, i) => (
          <li key={i} className="flex gap-3">
            <span aria-hidden className="font-mono font-medium text-lima">
              ·
            </span>
            <span>{r}</span>
          </li>
        ))}
      </ul>

      <Eyebrow tone="ambar" className="mb-3 mt-6">
        Principal riesgo
      </Eyebrow>
      <ul className="space-y-2">
        {alt.limitations.map((r, i) => (
          <li key={i} className="flex gap-3">
            <span aria-hidden className="font-mono font-medium text-ambar">
              –
            </span>
            <span>{r}</span>
          </li>
        ))}
      </ul>

      {testScores && (
        <div className="mt-6 border-t border-line pt-4">
          <Eyebrow tone="ambar">Puntajes de prueba (sintéticos)</Eyebrow>
          {typeof alt.score === 'number' && (
            <p className="mt-2 font-mono text-base text-ink">
              Total de prueba: {formatNumber(alt.score, 0)} / 100
              <span className="text-muted"> · no es una recomendación</span>
            </p>
          )}
          <CriteriaBreakdown criteria={alt.criteria} total={alt.score ?? 0} selected={false} />
        </div>
      )}

      <Eyebrow className="mb-3 mt-6">Fuentes</Eyebrow>
      <SourcesList sources={alt.sources} />
    </article>
  )
}
