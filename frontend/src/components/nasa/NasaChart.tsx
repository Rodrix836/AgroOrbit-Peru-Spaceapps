import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { NasaObservation } from '../../types/api'
import { Eyebrow } from '../ui/Eyebrow'
import { AXIS_TICK, GRID_STROKE, TOOLTIP_STYLE } from '../ui/styles'
import { nasaSeries } from './NasaCards'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic']

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`
}

/** Gráfico de barras azul: lluvia acumulada por mes dentro del período guardado. */
export function NasaChart({ observations }: { observations: NasaObservation[] }) {
  const byMonth = new Map<string, number>()
  for (const o of nasaSeries(observations, 'PRECTOTCORR')) {
    const key = o.observed_on.slice(0, 7)
    byMonth.set(key, (byMonth.get(key) ?? 0) + (o.value as number))
  }
  const data = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, mm]) => ({ key, mes: monthLabel(key), lluvia: Math.round(mm * 10) / 10 }))
  if (data.length === 0) return null

  return (
    <div className="border-t border-line pt-4">
      <Eyebrow tone="cielo">Lluvia por mes (mm) · NASA POWER</Eyebrow>
      <div className="mt-3 h-64 w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="mes" tick={AXIS_TICK} stroke="#3a4b41" />
            <YAxis tick={AXIS_TICK} width={36} stroke="#3a4b41" />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: '#1c2921' }}
              formatter={(v) => [`${v} mm`, 'Lluvia']}
            />
            <Bar dataKey="lluvia" name="Lluvia (mm)" fill="#7fbbff" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-muted">
        Suma de la lluvia diaria de cada mes dentro del período; los meses de los extremos pueden estar
        incompletos. Fuente: NASA POWER (contexto regional, no una medición sobre la parcela).
      </p>
    </div>
  )
}
