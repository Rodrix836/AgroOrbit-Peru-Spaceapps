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
import type { NasaObservation } from '../../types/api'
import { integerAxis } from '../../utils/chart'
import { displayUnit, formatDay, formatDayShort } from '../../utils/format'
import { Eyebrow } from '../ui/Eyebrow'
import { AXIS_TICK, GRID_STROKE, TOOLTIP_STYLE } from '../ui/styles'

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

const unitOf = (obs: NasaObservation[], variable: string, fallback: string) =>
  displayUnit(obs.find((o) => o.variable === variable)?.unit ?? fallback)

const MARGIN = { top: 5, right: 32, left: 8, bottom: 5 }
const Y_WIDTH = 48

const valuesOf = (rows: DayRow[], key: 'T2M' | 'PRECTOTCORR') =>
  rows.flatMap((r) => (r[key] === null ? [] : [r[key] as number]))

/** Dos gráficos azules por día: temperatura del aire (línea) y lluvia (barras). Los días sin dato quedan en blanco. */
export function NasaChart({ observations }: { observations: NasaObservation[] }) {
  const data = dailyRows(observations)
  if (data.length === 0) return null

  const tUnit = unitOf(observations, 'T2M', 'C')
  const rUnit = unitOf(observations, 'PRECTOTCORR', 'mm/day')
  const hasTemp = data.some((d) => d.T2M !== null)
  const hasRain = data.some((d) => d.PRECTOTCORR !== null)
  if (!hasTemp && !hasRain) return null
  const tAxis = hasTemp ? integerAxis(valuesOf(data, 'T2M')) : null
  const rAxis = hasRain ? integerAxis(valuesOf(data, 'PRECTOTCORR'), true) : null

  return (
    <div className="space-y-6 border-t border-line pt-4">
      {hasTemp && (
        <div>
          <Eyebrow tone="cielo">Temperatura del aire por día ({tUnit}) · NASA POWER</Eyebrow>
          <div className="mt-3 h-56 w-full">
            <ResponsiveContainer>
              <LineChart data={data} margin={MARGIN}>
                <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="day" tickFormatter={formatDayShort} minTickGap={50} tick={AXIS_TICK} stroke="#3a4b41" />
                <YAxis tick={AXIS_TICK} width={Y_WIDTH} domain={tAxis?.domain} ticks={tAxis?.ticks} allowDecimals={false} stroke="#3a4b41" />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelFormatter={(v) => formatDay(String(v))}
                  formatter={(v) => [v == null ? 'sin dato' : `${v} ${tUnit}`, 'Temperatura del aire']}
                />
                <Line
                  type="monotone"
                  dataKey="T2M"
                  name={`Temperatura del aire (${tUnit})`}
                  stroke="#7fbbff"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {hasRain && (
        <div>
          <Eyebrow tone="cielo">Lluvia por día ({rUnit}) · NASA POWER</Eyebrow>
          <div className="mt-3 h-56 w-full">
            <ResponsiveContainer>
              <BarChart data={data} margin={MARGIN}>
                <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="day" tickFormatter={formatDayShort} minTickGap={50} tick={AXIS_TICK} stroke="#3a4b41" />
                <YAxis tick={AXIS_TICK} width={Y_WIDTH} domain={rAxis?.domain} ticks={rAxis?.ticks} allowDecimals={false} stroke="#3a4b41" />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: '#1c2921' }}
                  labelFormatter={(v) => formatDay(String(v))}
                  formatter={(v) => [v == null ? 'sin dato' : `${v} ${rUnit}`, 'Lluvia']}
                />
                <Bar dataKey="PRECTOTCORR" name={`Lluvia (${rUnit})`} fill="#7fbbff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <p className="text-muted">
        Los días sin dato quedan en blanco: no se rellenan ni se cuentan como 0. Fuente: NASA POWER (contexto
        regional, no una medición sobre la parcela).
      </p>
    </div>
  )
}
