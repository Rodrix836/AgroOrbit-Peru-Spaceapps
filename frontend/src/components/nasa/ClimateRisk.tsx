import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ClimateHistory } from '../../hooks/useClimateHistory'
import { integerAxis } from '../../utils/chart'
import { MIN_YEARS, monthlyHistory, type RiskResult } from '../../utils/climateRisk'
import { formatNumber } from '../../utils/format'
import { todayLima } from '../../utils/period'
import { Eyebrow } from '../ui/Eyebrow'
import { SourceBadge } from '../ui/SourceBadge'
import { AXIS_TICK, GRID_STROKE, TOOLTIP_STYLE } from '../ui/styles'
import { useLanguage } from '../../i18n/LanguageContext'
import { localeOf, tr } from '../../i18n/active'

/** Mes abreviado (1 a 12) en el idioma activo. */
const monthShort = (m: number) =>
  new Date(Date.UTC(2000, m - 1, 1)).toLocaleDateString(localeOf(), { timeZone: 'UTC', month: 'short' })
const MARGIN = { top: 5, right: 24, left: 8, bottom: 5 }

interface Row {
  m: string
  /** Banda mínimo–máximo de los años disponibles; null si el mes tiene menos de 3 años válidos. */
  band: [number, number] | null
  median: number | null
  /** Último año (últimos 12 meses): punto. */
  last: number | null
  lastYm: string | null
  n: number
}

const toRows = (r: RiskResult): Row[] =>
  r.stats.map((s) => ({
    m: monthShort(s.month),
    band: s.min !== null && s.max !== null ? [s.min, s.max] : null,
    median: s.median,
    last: s.last,
    lastYm: s.lastYm,
    n: s.n,
  }))

/** «2 años», «1 año», «2.5 años» (años de datos guardados). */
const storedYears = (n: number) => {
  const v = Math.round(n * 10) / 10
  return tr(v === 1 ? 'nasa.risk.year' : 'nasa.risk.years', { n: formatNumber(v, 1) })
}

/** Texto de cuántos años entran: «10 años, 2016–2026». */
const yearsText = (r: RiskResult) =>
  tr('nasa.risk.yearsRange', {
    years: tr(r.years === 1 ? 'nasa.risk.year' : 'nasa.risk.years', { n: r.years }),
    first: r.firstYear ?? '',
    last: r.lastYear ?? '',
  })

function RiskTooltip({ active, payload, unit }: { active?: boolean; payload?: { payload: Row }[]; unit: string }) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  const f = (v: number | null) => (v === null ? tr('nasa.risk.noValue') : `${formatNumber(v, 1)} ${unit}`)
  return (
    <div style={TOOLTIP_STYLE} className="font-mono text-[13px] leading-5">
      <p className="text-ink">{r.m}</p>
      <p>
        {tr('nasa.risk.tipMinMax', {
          range: r.band
            ? tr('nasa.risk.tipRange', { a: formatNumber(r.band[0], 1), b: formatNumber(r.band[1], 1), unit })
            : tr('nasa.risk.noRange'),
        })}
      </p>
      <p>{tr('nasa.risk.tipMedian', { v: f(r.median) })}</p>
      <p>{tr('nasa.risk.tipLast12', { v: f(r.last) })}</p>
      <p>{tr('nasa.risk.tipYears', { n: r.n })}</p>
    </div>
  )
}

function RiskChart({
  title,
  unit,
  result,
  fromZero,
}: {
  title: string
  unit: string
  result: RiskResult
  fromZero: boolean
}) {
  const { t } = useLanguage()
  if (!result.sufficient) {
    return (
      <div>
        <Eyebrow tone="cielo">{title}</Eyebrow>
        <div className="mt-3 border border-dashed border-ambar bg-ambar-bg p-4">
          <p className="font-semibold text-ink">{t('nasa.risk.insuffTitle')}</p>
          <p className="mt-1 text-ink">
            {t('nasa.risk.insuffBody', { stored: storedYears(result.spanYears), min: MIN_YEARS })}
          </p>
          {result.spanYears >= MIN_YEARS && (
            <p className="mt-1 text-muted">{t('nasa.risk.insuffFew')}</p>
          )}
        </div>
      </div>
    )
  }

  const rows = toRows(result)
  const values = rows.flatMap((r) => [...(r.band ?? []), ...(r.last === null ? [] : [r.last])])
  const axis = integerAxis(values, fromZero)

  return (
    <div>
      <Eyebrow tone="cielo">{title}</Eyebrow>
      <p className="mt-1 font-mono text-base text-ink">
        {yearsText(result)}{' '}
        <span className="text-muted">{t('nasa.risk.eachMonthUses', { min: result.nMin, max: result.nMax })}</span>
      </p>
      <div className="mt-3 h-64 w-full">
        <ResponsiveContainer>
          <ComposedChart data={rows} margin={MARGIN}>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="m" tick={AXIS_TICK} stroke="#3a4b41" interval={0} />
            <YAxis
              tick={AXIS_TICK}
              width={48}
              stroke="#3a4b41"
              allowDecimals={false}
              domain={axis.domain}
              ticks={axis.ticks}
            />
            <Tooltip content={<RiskTooltip unit={unit} />} />
            <Area
              type="monotone"
              dataKey="band"
              stroke="none"
              fill="#7fbbff"
              fillOpacity={0.25}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="median"
              stroke="#7fbbff"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="last"
              stroke="none"
              dot={{ r: 4, fill: '#e8efe9', stroke: '#0b110e', strokeWidth: 1 }}
              activeDot={{ r: 5 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-base text-muted">
        <li>
          <span aria-hidden className="mr-2 inline-block h-3 w-5 bg-cielo/25 align-middle" />
          {t('nasa.risk.bandLegend', { unit })}
        </li>
        <li>
          <span aria-hidden className="mr-2 inline-block h-0.5 w-5 bg-cielo align-middle" />
          {t('nasa.risk.colMedian')}
        </li>
        <li>
          <span aria-hidden className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-ink align-middle" />
          {t('nasa.risk.lastTwelve')}
        </li>
      </ul>
      <details className="mt-3 border border-line p-3">
        <summary className="cursor-pointer font-medium text-ink">{t('nasa.risk.details')}</summary>
        <table className="mt-3 w-full font-mono text-base">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-1 pr-2 font-normal">{t('nasa.risk.colMonth')}</th>
              <th className="py-1 pr-2 font-normal">{t('nasa.risk.colMinMax')}</th>
              <th className="py-1 pr-2 font-normal">{t('nasa.risk.colMedian')}</th>
              <th className="py-1 font-normal">{t('nasa.risk.colLast')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.m} className="border-t border-line align-top">
                <td className="py-1 pr-2 text-ink">{r.m}</td>
                <td className="py-1 pr-2 text-cielo">
                  {r.band ? `${formatNumber(r.band[0], 1)}–${formatNumber(r.band[1], 1)}` : <span className="text-muted">{t('nasa.risk.noRange')}</span>}
                </td>
                <td className="py-1 pr-2 text-cielo">
                  {r.median === null ? <span className="text-muted">—</span> : formatNumber(r.median, 1)}
                </td>
                <td className="py-1 text-ink">{r.last === null ? <span className="text-muted">—</span> : formatNumber(r.last, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-muted">{t('nasa.risk.unitNote', { unit, min: MIN_YEARS })}</p>
      </details>
    </div>
  )
}

/**
 * Bloque «Riesgo e incertidumbre»: para cada mes del año, qué tanto ha variado la lluvia y la temperatura en los años
 * anteriores (banda mínimo–máximo, mediana y los últimos 12 meses). Cálculo del frontend sobre datos de NASA POWER.
 */
export function ClimateRisk({ history, example = false }: { history: ClimateHistory; example?: boolean }) {
  const { t } = useLanguage()
  const today = todayLima()
  const rain = monthlyHistory(history.rain, 'sum', today)
  const temp = monthlyHistory(history.temperature, 'mean', today)
  const rows = history.rain.length + history.temperature.length

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge kind="nasa" />
        <SourceBadge kind="prototype" label={t('nasa.risk.badge')} />
        {example && <SourceBadge kind="prototype" label={t('common.exampleData')} />}
      </div>
      <p className="max-w-prose text-ink">
        {t('nasa.risk.intro')}
      </p>
      {rows === 0 ? (
        <div className="border border-dashed border-ambar bg-ambar-bg p-4">
          <p className="font-semibold text-ink">{t('nasa.risk.insuffTitle')}</p>
          <p className="mt-1 text-muted">{t('nasa.risk.noHistory')}</p>
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-2">
          <RiskChart title={t('nasa.risk.rainTitle')} unit="mm" result={rain} fromZero />
          <RiskChart title={t('nasa.risk.tempTitle')} unit="°C" result={temp} fromZero={false} />
        </div>
      )}
      <p className="text-muted">
        {t('nasa.risk.footnote')}
      </p>
    </div>
  )
}
