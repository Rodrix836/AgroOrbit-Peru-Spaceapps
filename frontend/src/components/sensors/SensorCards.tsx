import { useState } from 'react'
import type { SensorReading, SensorType } from '../../types/api'
import { formatDateTime, formatNumber, HOURS_STALE, isStale } from '../../utils/format'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { Eyebrow } from '../ui/Eyebrow'
import { SourceBadge } from '../ui/SourceBadge'
import { StatCard } from '../ui/StatCard'

const SOURCE_DETAIL = 'Sensor ESP32 en tu parcela'
const TICKS = [0, 25, 50, 75, 100]

function latest(readings: SensorReading[], type: SensorType): SensorReading | null {
  const list = readings
    .filter((r) => r.sensor_type === type && r.calibrated_value !== null)
    .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
  return list[0] ?? null
}

/** Barra de 0 a 100 con marcas 0/25/50/75/100. */
function Gauge({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div>
      <div
        role="meter"
        aria-label="Humedad del suelo"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-3 w-full bg-track"
      >
        <div className="h-full bg-ambar" style={{ width: `${pct}%` }} />
      </div>
      <div className="relative mt-1 h-8 font-mono text-[13px] text-muted" aria-hidden>
        {TICKS.map((t) => (
          <span
            key={t}
            className="absolute top-0 flex flex-col items-center"
            style={{
              left: `${t}%`,
              transform: t === 0 ? 'none' : t === 100 ? 'translateX(-100%)' : 'translateX(-50%)',
              alignItems: t === 0 ? 'flex-start' : t === 100 ? 'flex-end' : 'center',
            }}
          >
            <span className="h-2 w-px bg-edge" />
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

export function SensorCards({ readings }: { readings: SensorReading[] }) {
  const [showTech, setShowTech] = useState(false)
  const moisture = latest(readings, 'soil_moisture')
  const temp = latest(readings, 'soil_temperature')

  if (!moisture && !temp) {
    return (
      <EmptyState
        tone="insufficient"
        title="El sensor aún no ha enviado lecturas"
        message="Cuando el ESP32 envíe su primera lectura aparecerá aquí. No mostramos valores de relleno."
      />
    )
  }

  const stale = [moisture, temp].some((r) => r && isStale(r.recorded_at))
  const lastAt = [moisture, temp]
    .filter((r): r is SensorReading => r !== null)
    .map((r) => r.recorded_at)
    .sort()
    .pop()

  return (
    <div className="space-y-6">
      {stale && (
        <Alert tone="warn" title="Sensor sin actualización">
          La última lectura tiene más de {HOURS_STALE} horas. Revisa que el equipo tenga energía y
          conexión.
        </Alert>
      )}

      <div>
        <Eyebrow>Humedad del suelo</Eyebrow>
        {moisture?.calibrated_value != null ? (
          <>
            <p className="mt-2 flex items-baseline gap-3 font-mono text-ambar">
              <span className="text-[clamp(88px,16vw,128px)] font-medium leading-none tracking-[-0.04em]">
                {formatNumber(moisture.calibrated_value, 0)}
              </span>
              <span className="text-3xl text-muted">%</span>
            </p>
            <div className="mt-4">
              <Gauge value={moisture.calibrated_value} />
            </div>
            <p className="mt-1 text-muted">Porcentaje según la calibración seco/húmedo del sensor.</p>
          </>
        ) : (
          <p className="mt-2 font-mono text-3xl text-muted">Sin dato</p>
        )}
      </div>

      <StatCard
        label="Temperatura del suelo"
        value={temp?.calibrated_value ?? null}
        unit="°C"
        when={temp ? formatDateTime(temp.recorded_at) : null}
        source="sensor"
        sourceDetail={SOURCE_DETAIL}
      />

      <div className="border-t border-line pt-4">
        <Eyebrow>Última lectura</Eyebrow>
        <p className="mt-1 font-mono text-base text-ink">{lastAt ? formatDateTime(lastAt) : 'Sin fecha'}</p>
        <div className="mt-2">
          <SourceBadge kind="sensor" />
        </div>
      </div>

      <div>
        <Button variant="ghost" onClick={() => setShowTech((v) => !v)} aria-expanded={showTech} className="!px-0">
          {showTech ? '– Ocultar detalle técnico' : '+ Detalle técnico'}
        </Button>
        {showTech && (
          <div className="mt-2 border border-line bg-bg p-4">
            <Eyebrow tone="ambar">Humedad cruda (sin calibrar)</Eyebrow>
            <p className="mt-1 font-mono text-base text-ink">
              {moisture?.raw_value ?? 'Sin dato'} {moisture?.raw_value != null && 'unidades del sensor'}
              {moisture ? ` · ${formatDateTime(moisture.recorded_at)}` : ''}
            </p>
            <p className="mt-1 text-muted">Fuente: {SOURCE_DETAIL}. Útil solo para calibrar el equipo.</p>
          </div>
        )}
      </div>
    </div>
  )
}
