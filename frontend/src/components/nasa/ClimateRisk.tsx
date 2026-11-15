import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ClimateHistory } from '../../hooks/useClimateHistory'
import { integerAxis } from '../../utils/chart'
import { MIN_YEARS, monthlyHistory, type RiskResult } from '../../utils/climateRisk'
import { formatNumber } from '../../utils/format'
import { todayLima } from '../../utils/period'
import { Eyebrow } from '../ui/Eyebrow'
import { SourceBadge } from '../ui/SourceBadge'
import { AXIS_TICK, GRID_STROKE, TOOLTIP_STYLE } from '../ui/styles'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic']
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
    m: MONTHS[s.month - 1],
    band: s.min !== null && s.max !== null ? [s.min, s.max] : null,
    median: s.median,
    last: s.last,
    lastYm: s.lastYm,
    n: s.n,
  }))

/** «2 años», «1 año», «2.5 años» (años de datos guardados). */
const storedYears = (n: number) => {
  const v = Math.round(n * 10) / 10
  return `${formatNumber(v, 1)} ${v === 1 ? 'año' : 'años'}`
}

/** Texto de cuántos años entran: «10 años, 2016–2026». */
const yearsText = (r: RiskResult) =>
  `${r.years} ${r.years === 1 ? 'año' : 'años'}, ${r.firstYear}–${r.lastYear}`

function RiskTooltip({ active, payload, unit }: { active?: boolean; payload?: { payload: Row }[]; unit: string }) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  const f = (v: number | null) => (v === null ? 'sin dato' : `${formatNumber(v, 1)} ${unit}`)
  return (
    <div style={TOOLTIP_STYLE} className="font-mono text-[13px] leading-5">
      <p className="text-ink">{r.m}</p>
      <p>
        Mín.–máx.: {r.band ? `${formatNumber(r.band[0], 1)} a ${formatNumber(r.band[1], 1)} ${unit}` : 'sin rango'}
      </p>
      <p>Mediana: {f(r.median)}</p>
      <p>Últimos 12 meses: {f(r.last)}</p>
      <p>Años usados: {r.n}</p>
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
  if (!result.sufficient) {
    return (
      <div>
        <Eyebrow tone="cielo">{title}</Eyebrow>
        <div className="mt-3 border border-dashed border-ambar bg-ambar-bg p-4">
          <p className="font-semibold text-ink">Histórico insuficiente para mostrar el rango</p>
          <p className="mt-1 text-ink">
            Hay {storedYears(result.spanYears)} de datos guardados; se necesitan al menos {MIN_YEARS} para mostrar el
            rango.
          </p>
          {result.spanYears >= MIN_YEARS && (
            <p className="mt-1 text-muted">
              Hay datos de ese período, pero muy pocos meses tienen al menos 80 % de sus días con dato. No
              rellenamos lo que falta.
            </p>
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
        {yearsText(result)} <span className="text-muted">· cada mes usa entre {result.nMin} y {result.nMax} años</span>
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
          Banda mín.–máx. ({unit})
        </li>
        <li>
          <span aria-hidden className="mr-2 inline-block h-0.5 w-5 bg-cielo align-middle" />
          Mediana
        </li>
        <li>
          <span aria-hidden className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-ink align-middle" />
          Últimos 12 meses
        </li>
      </ul>
      <details className="mt-3 border border-line p-3">
        <summary className="cursor-pointer font-medium text-ink">Ver los números por mes</summary>
        <table className="mt-3 w-full font-mono text-base">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-1 pr-2 font-normal">Mes</th>
              <th className="py-1 pr-2 font-normal">Mín.–máx.</th>
              <th className="py-1 pr-2 font-normal">Mediana</th>
              <th className="py-1 font-normal">Últ. 12 m</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.m} className="border-t border-line align-top">
                <td className="py-1 pr-2 text-ink">{r.m}</td>
                <td className="py-1 pr-2 text-cielo">
                  {r.band ? `${formatNumber(r.band[0], 1)}–${formatNumber(r.band[1], 1)}` : <span className="text-muted">sin rango</span>}
                </td>
                <td className="py-1 pr-2 text-cielo">
                  {r.median === null ? <span className="text-muted">—</span> : formatNumber(r.median, 1)}
                </td>
                <td className="py-1 text-ink">{r.last === null ? <span className="text-muted">—</span> : formatNumber(r.last, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-muted">Unidad: {unit}. «Sin rango»: ese mes tiene menos de {MIN_YEARS} años válidos.</p>
      </details>
    </div>
  )
}

/**
 * Bloque «Riesgo e incertidumbre»: para cada mes del año, qué tanto ha variado la lluvia y la temperatura en los años
 * anteriores (banda mínimo–máximo, mediana y los últimos 12 meses). Cálculo del frontend sobre datos de NASA POWER.
 */
export function ClimateRisk({ history, example = false }: { history: ClimateHistory; example?: boolean }) {
  const today = todayLima()
  const rain = monthlyHistory(history.rain, 'sum', today)
  const temp = monthlyHistory(history.temperature, 'mean', today)
  const rows = history.rain.length + history.temperature.length

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge kind="nasa" />
        <SourceBadge kind="prototype" label="Cálculo del frontend sobre datos de NASA POWER" />
        {example && <SourceBadge kind="prototype" label="Datos de ejemplo" />}
      </div>
      <p className="max-w-prose text-ink">
        La banda muestra lo que ha pasado en años anteriores en esta zona según NASA POWER. No es un pronóstico.
        Cuanto más ancha la banda, más distinto ha sido ese mes de un año a otro.
      </p>
      {rows === 0 ? (
        <div className="border border-dashed border-ambar bg-ambar-bg p-4">
          <p className="font-semibold text-ink">Histórico insuficiente para mostrar el rango</p>
          <p className="mt-1 text-muted">Todavía no hay histórico de NASA POWER guardado para esta parcela.</p>
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-2">
          <RiskChart title="Lluvia por mes (mm), suma mensual" unit="mm" result={rain} fromZero />
          <RiskChart title="Temperatura media por mes (°C)" unit="°C" result={temp} fromZero={false} />
        </div>
      )}
      <p className="text-muted">
        Un mes de un año solo cuenta si al menos el 80 % de sus días tiene dato; los días sin dato no se rellenan ni se
        cuentan como 0. La lluvia de cada mes es la suma de sus días con dato y la temperatura, su promedio. «Últimos 12
        meses»: el valor más reciente de cada mes dentro del último año.
      </p>
    </div>
  )
}
