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
import { Eyebrow } from '../ui/Eyebrow'
import { AXIS_TICK, GRID_STROKE, TOOLTIP_STYLE } from '../ui/styles'

const DAY = 24 * 3600_000

/** Gráfico de línea ámbar de las últimas 24 h de lecturas del sensor. */
export function ReadingsChart({ readings }: { readings: SensorReading[] }) {
  const valid = readings.filter((r) => r.calibrated_value !== null)
  if (valid.length === 0) return null
  const newest = Math.max(...valid.map((r) => new Date(r.recorded_at).getTime()))

  const byTime = new Map<string, { t: string; humedad?: number; temperatura?: number }>()
  for (const r of valid) {
    if (newest - new Date(r.recorded_at).getTime() > DAY) continue
    const row = byTime.get(r.recorded_at) ?? { t: r.recorded_at }
    if (r.sensor_type === 'soil_moisture') row.humedad = r.calibrated_value as number
    else row.temperatura = r.calibrated_value as number
    byTime.set(r.recorded_at, row)
  }
  const data = [...byTime.values()].sort((a, b) => a.t.localeCompare(b.t))
  if (data.length < 2) return null

  return (
    <div className="border-t border-line pt-4">
      <Eyebrow tone="ambar">Últimas 24 h · sensor ESP32</Eyebrow>
      <div className="mt-3 h-64 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="t" tickFormatter={formatShortTime} minTickGap={90} tick={AXIS_TICK} stroke="#3a4b41" />
            <YAxis yAxisId="h" tick={AXIS_TICK} width={44} unit="%" stroke="#3a4b41" />
            <YAxis yAxisId="t" orientation="right" tick={AXIS_TICK} width={44} unit="°" stroke="#3a4b41" />
            <Tooltip labelFormatter={(v) => formatShortTime(String(v))} contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13 }} />
            <Line
              yAxisId="h"
              type="monotone"
              dataKey="humedad"
              name="Humedad (%)"
              stroke="#f2b35e"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              yAxisId="t"
              type="monotone"
              dataKey="temperatura"
              name="Temp. suelo (°C)"
              stroke="#f2b35e"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-muted">Fuente: sensor ESP32 en tu parcela. Horas en hora de Perú.</p>
    </div>
  )
}
