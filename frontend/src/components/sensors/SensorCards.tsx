import { useState } from 'react'
import type { SensorReading, SensorType } from '../../types/api'
import { formatDateTime, HOURS_STALE, isStale } from '../../utils/format'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { StatCard } from '../ui/StatCard'

const SOURCE_DETAIL = 'Sensor ESP32 en tu parcela'

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
        tone="insufficient"
        title="Datos insuficientes: el sensor aún no ha enviado lecturas"
        message="Cuando el ESP32 envíe su primera lectura aparecerá aquí. No mostramos valores de relleno."
      />
    )
  }

  const stale = [moisture, temp].some((r) => r && isStale(r.recorded_at))

  return (
    <div className="space-y-4">
      {stale && (
        <Alert tone="warn" title="Sensor sin actualización">
          La última lectura tiene más de {HOURS_STALE} horas. Revisa que el equipo tenga energía y
          conexión.
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <StatCard
          label="Humedad del suelo"
          value={moisture?.calibrated_value ?? null}
          unit="%"
          when={moisture ? formatDateTime(moisture.recorded_at) : null}
          source="sensor"
          sourceDetail={SOURCE_DETAIL}
          note="Porcentaje según la calibración seco/húmedo del sensor."
        />
        <StatCard
          label="Temperatura del suelo"
          value={temp?.calibrated_value ?? null}
          unit="°C"
          when={temp ? formatDateTime(temp.recorded_at) : null}
          source="sensor"
          sourceDetail={SOURCE_DETAIL}
        />
      </div>
      <Button variant="ghost" onClick={() => setShowTech((v) => !v)} className="!px-0">
        {showTech ? 'Ocultar detalle técnico' : 'Ver detalle técnico (calibración)'}
      </Button>
      {showTech && (
        <div className="rounded-xl border border-soil-200 bg-white p-4 text-ink">
          <p className="font-bold">Humedad cruda (lectura sin calibrar)</p>
          <p>
            {moisture?.raw_value ?? 'Sin dato'} {moisture?.raw_value != null && 'unidades del sensor'}
            {moisture ? ` — ${formatDateTime(moisture.recorded_at)}` : ''}
          </p>
          <p className="mt-1 text-muted">Fuente: {SOURCE_DETAIL}. Útil solo para calibrar el equipo.</p>
        </div>
      )}
    </div>
  )
}
