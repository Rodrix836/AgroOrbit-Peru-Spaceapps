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
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <p className="mb-2 font-semibold">Clima regional diario</p>
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="d" tickFormatter={formatDay} minTickGap={50} fontSize={12} />
            <YAxis yAxisId="l" fontSize={12} unit=" mm" />
            <YAxis yAxisId="t" orientation="right" fontSize={12} unit="°" />
            <Tooltip labelFormatter={(v) => formatDay(String(v))} />
            <Legend />
            <Bar yAxisId="l" dataKey="lluvia" name="Lluvia (mm/día)" fill="#1d4ed8" />
            <Line
              yAxisId="t"
              type="monotone"
              dataKey="temperatura"
              name="Temp. del aire (°C)"
              stroke="#dc2626"
              strokeWidth={3}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-xs text-stone-600">
        Fuente: NASA POWER. Datos de modelo con escala regional; fechas en tiempo solar local de POWER.
      </p>
    </div>
  )
}
