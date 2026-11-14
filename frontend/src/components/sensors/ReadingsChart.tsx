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
import { integerAxis } from '../../utils/chart'
import { formatHour24, formatShortTime } from '../../utils/format'
import { Eyebrow } from '../ui/Eyebrow'
import { AXIS_TICK, GRID_STROKE, TOOLTIP_STYLE } from '../ui/styles'
import { TestBadge } from './QualityNotice'

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
  const tempValues = data.flatMap((d) => (d.temperatura === undefined ? [] : [d.temperatura]))
  const tempAxis = tempValues.length ? integerAxis(tempValues) : null
  const hasTest = valid.some(
    (r) => r.quality_flag === 'test' && newest - new Date(r.recorded_at).getTime() <= DAY,
  )

  return (
    <div className="border-t border-line pt-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Eyebrow tone="ambar">Últimas 24 h · sensor ESP32</Eyebrow>
        {hasTest && <TestBadge />}
      </div>
      <div className="mt-3 h-64 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 12, left: 8, bottom: 5 }}>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="t" tickFormatter={formatHour24} minTickGap={60} tick={AXIS_TICK} stroke="#3a4b41" />
            <YAxis
              yAxisId="h"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={AXIS_TICK}
              width={52}
              unit="%"
              stroke="#3a4b41"
            />
            <YAxis
              yAxisId="t"
              orientation="right"
              domain={tempAxis?.domain}
              ticks={tempAxis?.ticks}
              allowDecimals={false}
              tick={AXIS_TICK}
              width={44}
              unit="°"
              stroke="#3a4b41"
            />
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
      <p className="mt-2 text-muted">
        Fuente: sensor ESP32 en tu parcela. Horas en hora de Perú.
        {hasTest && ' Incluye lecturas de un kit de prueba: no son datos de campo.'}
      </p>
    </div>
  )
}
