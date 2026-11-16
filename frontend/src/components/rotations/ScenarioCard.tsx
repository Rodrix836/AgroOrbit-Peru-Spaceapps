import type { Criteria, Crop } from '../../types/api'
import type { ScenarioCardModel } from '../../types/scenario'
import { formatDay, formatFixed, formatNumber } from '../../utils/format'
import { daysBetween } from '../../utils/period'
import type { CampaignStats } from '../../utils/windowStats'
import { Eyebrow } from '../ui/Eyebrow'
import { CampaignCalendar } from './CampaignCalendar'
import { CriteriaBreakdown } from './CriteriaBreakdown'
import { hasCriteria } from './criteria'
import { cropName } from './labels'
import { SourcesList } from './SourcesList'
import { displaySources, isSynthetic, stripSynthetic } from './synthetic'
import { useLanguage } from '../../i18n/LanguageContext'
import { td } from '../../i18n/dataText'

/** «En estas fechas, en N años: lluvia X–Y mm (mediana Z) · temperatura X–Y °C» (histórico real de NASA POWER). */
function WindowLine({ stats }: { stats: CampaignStats }) {
  const { t } = useLanguage()
  const { rain, temp } = stats
  const f0 = (v: number | null) => formatNumber(v ?? 0, 0)
  const f1 = (v: number | null) => formatFixed(v ?? 0, 1)
  let body: string
  if (!rain.sufficient && !temp.sufficient) {
    body = t('wl.insufficient')
  } else {
    const sameYears = rain.sufficient && temp.sufficient && rain.n === temp.n
    const rainTxt = rain.sufficient
      ? t('wl.rain', {
          min: f0(rain.min),
          max: f0(rain.max),
          median: f0(rain.median),
          years: sameYears ? '' : t('wl.rainYears', { n: rain.n }),
        })
      : t('wl.rainNo')
    const tempTxt = temp.sufficient
      ? t('wl.temp', {
          min: f1(temp.min),
          max: f1(temp.max),
          years: sameYears ? '' : ` ${t('wl.tempYears', { n: temp.n })}`,
        })
      : t('wl.tempNo')
    body = `${sameYears ? t('wl.prefixSame', { n: rain.n }) : t('wl.prefix')} ${rainTxt} · ${tempTxt}`
  }
  return (
    <p className="mt-1 font-mono text-base text-cielo">
      {body}
      <span className="text-muted"> · NASA POWER</span>
    </p>
  )
}

/**
 * Una secuencia de dos campañas del escenario de demostración: nombre y descripción de la estrategia, campañas con
 * fechas y días, calendario, «Qué se puede comparar», «Principal riesgo y límites» y fuentes. Los textos «SYNTHETIC …»
 * van aparte, en «Datos de prueba» (sin el prefijo en inglés), y score/criteria solo dentro del bloque plegado
 * «Criterio de prueba (sintético)». Sin «mejor puntaje», `selected_id` ni resaltado de ganadora: la referencia se
 * distingue con borde neutro y rótulo, sin sugerir que es mejor o peor.
 */
export function ScenarioCard({
  card,
  crops,
  syntheticNote,
  previousCriteria,
  windowStats,
}: {
  card: ScenarioCardModel
  crops: Crop[]
  /** demo.sintetico.puntuaciones: qué es sintético en los puntajes. */
  syntheticNote?: string
  /** Criterios de esta alternativa con la otra prioridad (para resaltar qué pesos de prueba cambiaron). */
  previousCriteria?: Criteria
  /** Histórico de NASA POWER en las fechas de cada campaña (mismo orden que las campañas); sin él no se muestra la línea. */
  windowStats?: CampaignStats[]
}) {
  const { t } = useLanguage()
  const { alt } = card
  const reference = card.role === 'reference'
  const named = alt.campaigns.map((c) => ({ ...c, crop: cropName(c.crop, crops) }))
  const sequence = named.map((c) => c.crop).join(' → ')

  const first = alt.campaigns[0]
  const last = alt.campaigns[alt.campaigns.length - 1]
  const totalDays = first && last ? daysBetween(first.starts_on, last.ends_on) : null

  const reasons = alt.reasons.filter((t) => !isSynthetic(t))
  const limits = alt.limitations.filter((t) => !isSynthetic(t))
  const testTexts = [...alt.reasons, ...alt.limitations].filter(isSynthetic).map((x) => td(stripSynthetic(x)))
  const hasTestScores = typeof alt.score === 'number' || hasCriteria(alt.criteria)

  return (
    <article className={`min-w-0 bg-panel p-6 md:p-8 ${reference ? 'border-2 border-edge' : 'border-2 border-transparent'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Eyebrow tone={reference ? 'muted' : 'cielo'}>{td(card.nombre)}</Eyebrow>
        {reference && (
          <span className="border border-edge px-2 py-0.5 font-mono text-[13px] uppercase tracking-[0.12em] text-muted">
            {t('card.reference')}
          </span>
        )}
      </div>

      <h3 className="mt-3 font-display text-[clamp(26px,4vw,36px)] font-extrabold leading-none tracking-[-0.03em] text-ink">
        {sequence || t('card.noSequence')}
      </h3>
      {card.descripcion && <p className="mt-3 text-ink">{td(card.descripcion)}</p>}

      <Eyebrow className="mb-3 mt-6">{t('card.twoCampaigns')}</Eyebrow>
      <ol className="space-y-3">
        {named.map((c, i) => (
          <li key={i} className="border-l-2 border-edge pl-3">
            <p className="font-medium text-ink">
              {t('card.campaign', { n: i + 1, crop: c.crop })}
            </p>
            <p className="font-mono text-base text-ink">
              {t('card.range', { from: formatDay(c.starts_on), to: formatDay(c.ends_on) })}
            </p>
            <p className="font-mono text-base text-muted">{t('card.daysN', { n: daysBetween(c.starts_on, c.ends_on) })}</p>
            {windowStats?.[i] && <WindowLine stats={windowStats[i]} />}
          </li>
        ))}
      </ol>
      {totalDays !== null && (
        <p className="mt-3 font-mono text-base text-ink">
          <span className="font-medium">{t('card.total', { n: totalDays })}</span>
        </p>
      )}

      <Eyebrow className="mb-3 mt-6">{t('card.calendar')}</Eyebrow>
      <CampaignCalendar campaigns={named} showList={false} />

      {reasons.length > 0 && (
        <>
          <Eyebrow tone="lima" className="mb-3 mt-6">
            {t('card.compare')}
          </Eyebrow>
          <ul className="space-y-2">
            {reasons.map((r, i) => (
              <li key={i} className="flex gap-3">
                <span aria-hidden className="font-mono font-medium text-lima">
                  ·
                </span>
                <span>{td(r)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {limits.length > 0 && (
        <>
          <Eyebrow tone="ambar" className="mb-3 mt-6">
            {t('card.risk')}
          </Eyebrow>
          <ul className="space-y-2">
            {limits.map((r, i) => (
              <li key={i} className="flex gap-3">
                <span aria-hidden className="font-mono font-medium text-ambar">
                  –
                </span>
                <span>{td(r)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Textos «SYNTHETIC …» del motor, siempre identificados como datos de prueba */}
      {testTexts.length > 0 && (
        <div className="mt-6 border border-dashed border-ambar p-4">
          <Eyebrow tone="ambar" className="mb-2">
            {t('card.testData')}
          </Eyebrow>
          <ul className="space-y-2">
            {testTexts.map((t, i) => (
              <li key={i} className="flex gap-3 text-muted">
                <span aria-hidden className="font-mono text-ambar">
                  –
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* score y criteria: solo plegados y rotulados como criterio de prueba */}
      {hasTestScores && (
        <details className="mt-6 border border-ambar bg-ambar-bg p-4">
          <summary className="cursor-pointer font-medium text-ambar">{t('card.testCriterion')}</summary>
          {syntheticNote && <p className="mt-3 text-ink">{td(syntheticNote)}</p>}
          {typeof alt.score === 'number' && (
            <p className="mt-3 font-mono text-base text-ink">
              {t('card.testScore', { score: formatNumber(alt.score, 1) })}
              <span className="text-muted"> {t('card.notWinner')}</span>
            </p>
          )}
          <CriteriaBreakdown criteria={alt.criteria} total={alt.score ?? 0} previous={previousCriteria} selected={false} />
        </details>
      )}

      <Eyebrow className="mb-3 mt-6">{t('card.sources')}</Eyebrow>
      <SourcesList sources={displaySources(alt.sources)} />
    </article>
  )
}
