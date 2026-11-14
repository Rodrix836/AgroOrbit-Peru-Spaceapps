import { useState } from 'react'
import type { SensorReading, SensorType } from '../../types/api'
import { formatDateTime, HOURS_STALE, isStale } from '../../utils/format'
import { DataStat } from '../ui/DataStat'
import { EmptyState } from '../ui/EmptyState'

const SOURCE = 'Sensor ESP32 en tu parcela'

function latest(readings: SensorReading[], type: SensorType): SensorReading | null {
  const list = readings
    .filter((r) => r.sensor_type === type && r.calibrated_value !== null)
    .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
  return list[0] ?? null
}

export function SensorCards({ readings }: { readings: SensorReading[] }) {
  const [showTech, setShowTech] = useState(false)
  const moisture = latest(readings, 'soil_moisture')
  const temp = latest(readings, 'soil_temperature')

  if (!moisture && !temp) {
    return (
      <EmptyState
        tone="warning"
        title="Datos insuficientes: el sensor aún no ha enviado lecturas"
        message="Cuando el ESP32 envíe su primera lectura aparecerá aquí. No mostramos valores de relleno."
      />
    )
  }

  const stale = [moisture, temp].some((r) => r && isStale(r.recorded_at))

  return (
    <div className="space-y-3">
      {stale && (
        <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900">
          Sensor sin actualización: la última lectura tiene más de {HOURS_STALE} horas. Revisa que el
          equipo tenga energía y conexión.
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <DataStat
          label="Humedad del suelo"
          value={moisture?.calibrated_value ?? null}
          unit="%"
          when={moisture ? formatDateTime(moisture.recorded_at) : null}
          source={SOURCE}
          kind="sensor"
          note="Porcentaje según la calibración seco/húmedo del sensor."
        />
        <DataStat
          label="Temperatura del suelo"
          value={temp?.calibrated_value ?? null}
          unit="°C"
          when={temp ? formatDateTime(temp.recorded_at) : null}
          source={SOURCE}
          kind="sensor"
        />
      </div>
      <button
        onClick={() => setShowTech((v) => !v)}
        className="text-sm font-medium text-campo-800 underline"
      >
        {showTech ? 'Ocultar detalle técnico' : 'Ver detalle técnico (calibración)'}
      </button>
      {showTech && (
        <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
          <p className="font-semibold">Humedad cruda (lectura sin calibrar)</p>
          <p>
            {moisture?.raw_value ?? 'Sin dato'} {moisture?.raw_value != null && 'unidades del sensor'}
            {moisture ? ` — ${formatDateTime(moisture.recorded_at)}` : ''}
          </p>
          <p className="mt-1">Fuente: {SOURCE}. Útil solo para calibrar el equipo.</p>
        </div>
      )}
    </div>
  )
}
