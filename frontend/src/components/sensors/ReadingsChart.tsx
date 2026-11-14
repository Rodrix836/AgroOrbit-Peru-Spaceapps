import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { SensorReading } from '../../types/api'
import { formatShortTime } from '../../utils/format'

/** Gráfico de lecturas del sensor: humedad (%) y temperatura del suelo (°C). */
export function ReadingsChart({ readings }: { readings: SensorReading[] }) {
  const byTime = new Map<string, { t: string; humedad?: number; temperatura?: number }>()
  for (const r of readings) {
    if (r.calibrated_value === null) continue
    const row = byTime.get(r.recorded_at) ?? { t: r.recorded_at }
    if (r.sensor_type === 'soil_moisture') row.humedad = r.calibrated_value
    else row.temperatura = r.calibrated_value
    byTime.set(r.recorded_at, row)
  }
  const data = [...byTime.values()].sort((a, b) => a.t.localeCompare(b.t))
  if (data.length < 2) return null

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <p className="mb-2 font-semibold">Lecturas del sensor ESP32</p>
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="t" tickFormatter={formatShortTime} minTickGap={50} fontSize={12} />
            <YAxis yAxisId="h" fontSize={12} unit="%" />
            <YAxis yAxisId="t" orientation="right" fontSize={12} unit="°" />
            <Tooltip labelFormatter={(v) => formatShortTime(String(v))} />
            <Legend />
            <Line
              yAxisId="h"
              type="monotone"
              dataKey="humedad"
              name="Humedad del suelo (%)"
              stroke="#15803d"
              strokeWidth={3}
              dot={false}
            />
            <Line
              yAxisId="t"
              type="monotone"
              dataKey="temperatura"
              name="Temp. del suelo (°C)"
              stroke="#a16207"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-xs text-stone-600">
        Fuente: sensor ESP32 en tu parcela. Horas en hora de Perú.
      </p>
    </div>
  )
}
