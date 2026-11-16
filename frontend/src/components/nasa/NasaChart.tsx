import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { NasaView } from '../../hooks/useNasa'
import type { NasaObservation } from '../../types/api'
import { integerAxis } from '../../utils/chart'
import { displayUnit, formatDay, formatDayShort, formatNumber } from '../../utils/format'
import { addDays } from '../../utils/period'
import { Eyebrow } from '../ui/Eyebrow'
import { AXIS_TICK, GRID_STROKE, TOOLTIP_STYLE } from '../ui/styles'
import { useLanguage } from '../../i18n/LanguageContext'
import { localeOf } from '../../i18n/active'

interface DayRow {
  day: string
  /** null = POWER no tiene el dato: queda un hueco, no se interpola ni se pone en 0. */
  T2M: number | null
  PRECTOTCORR: number | null
}

function dailyRows(observations: NasaObservation[]): DayRow[] {
  const byDay = new Map<string, DayRow>()
  for (const o of observations) {
    if (o.variable !== 'T2M' && o.variable !== 'PRECTOTCORR') continue
    const row = byDay.get(o.observed_on) ?? { day: o.observed_on, T2M: null, PRECTOTCORR: null }
    row[o.variable] = o.value
    byDay.set(o.observed_on, row)
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day))
}

interface MonthRow {
  key: string // AAAA-MM
  /** Promedio mensual de T2M; null si el mes no tiene ningún día con dato. */
  T2M: number | null
  /** Suma mensual de PRECTOTCORR; null si el mes no tiene ningún día con dato. */
  PRECTOTCORR: number | null
  tempDays: number
  rainDays: number
  /** Días del mes que caen dentro del período (los meses de los extremos pueden ser parciales). */
  monthDays: number
}

/** Un registro por mes del período, también los que no tienen datos (quedan vacíos, no en 0). */
function monthlyRows(observations: NasaObservation[], from: string, to: string): MonthRow[] {
  const rows = new Map<string, MonthRow & { tSum: number; rSum: number }>()
  // Meses del período con los días que caen dentro.
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const key = day.slice(0, 7)
    const r = rows.get(key) ?? {
      key,
      T2M: null,
      PRECTOTCORR: null,
      tempDays: 0,
      rainDays: 0,
      monthDays: 0,
      tSum: 0,
      rSum: 0,
    }
    r.monthDays++
    rows.set(key, r)
  }
  for (const o of observations) {
    const r = rows.get(o.observed_on.slice(0, 7))
    if (!r || o.value === null) continue
    if (o.variable === 'T2M') {
      r.tSum += o.value
      r.tempDays++
    } else if (o.variable === 'PRECTOTCORR') {
      r.rSum += o.value
      r.rainDays++
    }
  }
  const r1 = (n: number) => Math.round(n * 10) / 10
  return [...rows.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((r) => ({
      key: r.key,
      T2M: r.tempDays > 0 ? r1(r.tSum / r.tempDays) : null,
      PRECTOTCORR: r.rainDays > 0 ? r1(r.rSum) : null,
      tempDays: r.tempDays,
      rainDays: r.rainDays,
      monthDays: r.monthDays,
    }))
}

const monthLabel = (key: string) =>
  new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1)).toLocaleDateString(localeOf(), {
    timeZone: 'UTC',
    month: 'short',
    year: '2-digit',
  })

const unitOf = (obs: NasaObservation[], variable: string, fallback: string) =>
  displayUnit(obs.find((o) => o.variable === variable)?.unit ?? fallback)

const MARGIN = { top: 5, right: 32, left: 8, bottom: 5 }
const Y_WIDTH = 48

const valuesOf = (values: (number | null)[]) => values.flatMap((v) => (v === null ? [] : [v]))

/**
 * Gráficos azules de NASA POWER (T2M y PRECTOTCORR). 90 días: un punto por día. 1 y 2 años: temperatura
 * promedio mensual y lluvia sumada por mes, para que se lea. Los días o meses sin dato quedan en blanco.
 */
export function NasaChart({ observations, view }: { observations: NasaObservation[]; view: NasaView }) {
  const { t } = useLanguage()
  const monthly = view.period.days > 90
  const tUnit = unitOf(observations, 'T2M', 'C')
  const rUnit = unitOf(observations, 'PRECTOTCORR', 'mm/day')

  const daily = monthly ? [] : dailyRows(observations)
  const months = monthly ? monthlyRows(observations, view.from, view.to) : []
  const data: (DayRow | MonthRow)[] = monthly ? months : daily

  const temps = data.map((d) => d.T2M)
  const rains = data.map((d) => d.PRECTOTCORR)
  const hasTemp = temps.some((v) => v !== null)
  const hasRain = rains.some((v) => v !== null)
  if (!hasTemp && !hasRain) return null

  const tAxis = hasTemp ? integerAxis(valuesOf(temps)) : null
  const rAxis = hasRain ? integerAxis(valuesOf(rains), true) : null

  const xProps = monthly
    ? { dataKey: 'key', tickFormatter: monthLabel, minTickGap: 24 }
    : { dataKey: 'day', tickFormatter: formatDayShort, minTickGap: 50 }
  const labelFormatter = (v: unknown) => (monthly ? monthLabel(String(v)) : formatDay(String(v)))
  const yStyle = { tick: AXIS_TICK, width: Y_WIDTH, stroke: '#3a4b41', allowDecimals: false }

  return (
    <div className="space-y-6 border-t border-line pt-4">
      {hasTemp && (
        <div>
          <Eyebrow tone="cielo">
            {t('nasa.chart.titleTemp', {
              title: monthly ? t('nasa.chart.tempMonthly') : t('nasa.chart.tempDaily'),
              unit: tUnit,
            })}
          </Eyebrow>
          <div className="mt-3 h-56 w-full">
            <ResponsiveContainer>
              <LineChart data={data} margin={MARGIN}>
                <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                <XAxis {...xProps} tick={AXIS_TICK} stroke="#3a4b41" />
                <YAxis {...yStyle} domain={tAxis?.domain} ticks={tAxis?.ticks} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelFormatter={labelFormatter}
                  formatter={(v, _n, item) => {
                    const row = item.payload as MonthRow
                    const extra = monthly ? ` ${t('nasa.chart.daysWithData', { n: row.tempDays, total: row.monthDays })}` : ''
                    return [
                      v == null ? t('nasa.chart.noData') : `${v} ${tUnit}${extra}`,
                      monthly ? t('nasa.chart.monthAvg') : t('nasa.chart.airTemp'),
                    ]
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="T2M"
                  name={t('nasa.chart.airTempUnit', { unit: tUnit })}
                  stroke="#7fbbff"
                  strokeWidth={2}
                  dot={monthly ? { r: 3, fill: '#7fbbff' } : false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {hasRain && (
        <div>
          <Eyebrow tone="cielo">
            {monthly ? t('nasa.chart.rainMonthlyTitle') : t('nasa.chart.rainDailyTitle', { unit: rUnit })}
          </Eyebrow>
          <div className="mt-3 h-56 w-full">
            <ResponsiveContainer>
              <BarChart data={data} margin={MARGIN}>
                <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                <XAxis {...xProps} tick={AXIS_TICK} stroke="#3a4b41" />
                <YAxis {...yStyle} domain={rAxis?.domain} ticks={rAxis?.ticks} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: '#1c2921' }}
                  labelFormatter={labelFormatter}
                  formatter={(v, _n, item) => {
                    const row = item.payload as MonthRow
                    const unit = monthly ? 'mm' : rUnit
                    const extra = monthly ? ` ${t('nasa.chart.daysWithData', { n: row.rainDays, total: row.monthDays })}` : ''
                    return [
                      v == null ? t('nasa.chart.noData') : `${v} ${unit}${extra}`,
                      monthly ? t('nasa.chart.monthRain') : t('nasa.chart.rain'),
                    ]
                  }}
                />
                <Bar
                  dataKey="PRECTOTCORR"
                  name={monthly ? t('nasa.chart.monthRainMm') : t('nasa.chart.rainUnit', { unit: rUnit })}
                  fill="#7fbbff"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {monthly && (
        <details className="border border-line p-3">
          <summary className="cursor-pointer font-medium text-ink">{t('nasa.chart.detail')}</summary>
          <table className="mt-3 w-full font-mono text-base">
            <thead className="text-left text-muted">
              <tr>
                <th className="py-1 pr-2 font-normal">{t('nasa.chart.colMonth')}</th>
                <th className="py-1 pr-2 font-normal">{t('nasa.chart.colRain')}</th>
                <th className="py-1 font-normal">{t('nasa.chart.colTemp', { unit: tUnit })}</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.key} className="border-t border-line align-top">
                  <td className="py-1 pr-2 text-ink">{monthLabel(m.key)}</td>
                  <td className="py-1 pr-2 text-cielo">
                    {m.PRECTOTCORR === null ? (
                      <span className="text-muted">{t('nasa.chart.noData')}</span>
                    ) : (
                      <>
                        {formatNumber(m.PRECTOTCORR, 1)}{' '}
                        <span className="text-muted">
                          ({m.rainDays}/{m.monthDays})
                        </span>
                      </>
                    )}
                  </td>
                  <td className="py-1 text-cielo">
                    {m.T2M === null ? (
                      <span className="text-muted">{t('nasa.chart.noData')}</span>
                    ) : (
                      <>
                        {formatNumber(m.T2M, 1)}{' '}
                        <span className="text-muted">
                          ({m.tempDays}/{m.monthDays})
                        </span>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-muted">{t('nasa.chart.parens')}</p>
        </details>
      )}

      <p className="text-muted">
        {monthly ? t('nasa.chart.noteMonthly') : t('nasa.chart.noteDaily')} {t('nasa.chart.source')}
      </p>
    </div>
  )
}
