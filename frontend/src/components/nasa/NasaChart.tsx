import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { NasaObservation } from '../../types/api'
import { formatDay } from '../../utils/format'
import { nasaSeries } from './NasaCards'

/** Clima regional NASA POWER: lluvia diaria (mm) y temperatura del aire (°C). */
export function NasaChart({ observations }: { observations: NasaObservation[] }) {
  const rows = new Map<string, { d: string; lluvia?: number; temperatura?: number }>()
  for (const o of nasaSeries(observations, 'T2M')) {
    rows.set(o.observed_on, { d: o.observed_on, temperatura: o.value as number })
  }
  for (const o of nasaSeries(observations, 'PRECTOTCORR')) {
    const row = rows.get(o.observed_on) ?? { d: o.observed_on }
    row.lluvia = o.value as number
    rows.set(o.observed_on, row)
  }
  const data = [...rows.values()].sort((a, b) => a.d.localeCompare(b.d))
  if (data.length < 2) return null

  return (
    <div className="rounded-2xl border border-nasa-200 bg-white p-3">
      <p className="mb-2 font-bold text-nasa-800">Clima regional diario</p>
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#b9cffc" />
            <XAxis dataKey="d" tickFormatter={formatDay} minTickGap={90} fontSize={16} />
            <YAxis yAxisId="l" fontSize={16} width={45} />
            <YAxis yAxisId="t" orientation="right" fontSize={16} width={45} unit="°" />
            <Tooltip labelFormatter={(v) => formatDay(String(v))} contentStyle={{ fontSize: 16 }} />
            <Legend wrapperStyle={{ fontSize: 16 }} />
            <Bar yAxisId="l" dataKey="lluvia" name="Lluvia (mm/día)" fill="#1d4ed8" />
            <Line
              yAxisId="t"
              type="monotone"
              dataKey="temperatura"
              name="Temp. aire (°C)"
              stroke="#b42318"
              strokeWidth={3}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-muted">
        Fuente: NASA POWER. Datos de modelo con escala regional; fechas en tiempo solar local de POWER.
      </p>
    </div>
  )
}
