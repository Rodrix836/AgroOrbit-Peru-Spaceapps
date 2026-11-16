import { useState } from 'react'
import type { SensorReading, SensorType } from '../../types/api'
import { useNow } from '../../hooks/useNow'
import { formatDateTime, formatHour24, formatNumber, formatShortTime, isStale } from '../../utils/format'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { Eyebrow } from '../ui/Eyebrow'
import { SourceBadge } from '../ui/SourceBadge'
import { StatCard } from '../ui/StatCard'
import { Freshness } from './Freshness'
import { QualityNotice } from './QualityNotice'
import { useLanguage } from '../../i18n/LanguageContext'
import { localeOf, tr } from '../../i18n/active'

const TICKS = [0, 25, 50, 75, 100]

/** Última lectura de un tipo de sensor (la API las entrega en orden ascendente por recorded_at). */
function latest(readings: SensorReading[], type: SensorType): SensorReading | null {
  let last: SensorReading | null = null
  for (const r of readings) {
    if (r.sensor_type === type && r.calibrated_value !== null) {
      if (!last || r.recorded_at >= last.recorded_at) last = r
    }
  }
  return last
}

/** Barra de 0 a 100 con marcas 0/25/50/75/100. */
function Gauge({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div>
      <div
        role="meter"
        aria-label={tr('sensor.gaugeLabel')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="relative h-3 w-full bg-track"
      >
        <div className="h-full bg-ambar" style={{ width: `${pct}%` }} />
        {/* Marca fina en la posición del valor: con 0 % la barra queda vacía, pero la marca muestra que es 0 y no «sin dato». */}
        <div
          aria-hidden
          className="absolute -top-1 h-5 w-[3px] bg-ink"
          style={{ left: `${pct}%`, transform: `translateX(-${pct}%)` }}
        />
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
  const { t } = useLanguage()
  const sourceDetail = t('sensor.sourceDetail')
  const [showTech, setShowTech] = useState(false)
  const now = useNow(1000) // «hace 12 s» avanza solo, sin recargar
  const moisture = latest(readings, 'soil_moisture')
  const temp = latest(readings, 'soil_temperature')

  if (!moisture && !temp) {
    return (
      <EmptyState
        tone="insufficient"
        title={t('sensor.none.title')}
        message={t('sensor.none.message')}
      />
    )
  }

  const lastAt = [moisture, temp]
    .filter((r): r is SensorReading => r !== null)
    .map((r) => r.recorded_at)
    .sort()
    .pop()
  const stale = lastAt ? isStale(lastAt, now) : false
  // «desde las 16:51»; si la última lectura no es de hoy, con la fecha.
  const day = (ms: number | string) => new Date(ms).toLocaleDateString(localeOf(), { timeZone: 'America/Lima' })
  const since = lastAt ? (day(lastAt) === day(now) ? t('sensor.sinceToday', { time: formatHour24(lastAt) }) : t('sensor.sinceDate', { date: formatShortTime(lastAt) })) : ''

  return (
    <div className="space-y-6">
      {stale && (
        <Alert tone="warn">
          <span className="font-semibold">{t('sensor.stale', { since })}</span> {t('sensor.staleHelp')}
        </Alert>
      )}

      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Eyebrow>{t('sensor.soilMoisture')}</Eyebrow>
          <QualityNotice reading={moisture} />
        </div>
        {moisture?.calibrated_value != null ? (
          <>
            <p className={`mt-2 flex items-baseline gap-3 font-mono text-ambar ${stale ? 'opacity-40' : ''}`}>
              <span className="text-[clamp(88px,16vw,128px)] font-medium leading-none tracking-[-0.04em]">
                {formatNumber(moisture.calibrated_value, 0)}
              </span>
              <span className="text-3xl text-muted">%</span>
            </p>
            <div className={`mt-4 ${stale ? 'opacity-40' : ''}`}>
              <Gauge value={moisture.calibrated_value} />
            </div>
            <p className="mt-1 text-muted">{t('sensor.calibrationNote')}</p>
            <Freshness recordedAt={moisture.recorded_at} now={now} />
          </>
        ) : (
          <p className="mt-2 font-mono text-3xl text-muted">{t('common.noData')}</p>
        )}
      </div>

      <StatCard
        label={t('sensor.soilTemp')}
        value={temp?.calibrated_value ?? null}
        unit="°C"
        source="sensor"
        sourceDetail={sourceDetail}
        badge={<QualityNotice reading={temp} />}
        dim={stale}
        extra={temp ? <Freshness recordedAt={temp.recorded_at} now={now} /> : undefined}
      />

      <div className="border-t border-line pt-4">
        <Eyebrow>{t('sensor.lastReadingAt')}</Eyebrow>
        {moisture && temp && moisture.recorded_at !== temp.recorded_at ? (
          <div className="mt-1 font-mono text-base text-ink">
            <p>{t('sensor.moistureAt', { when: formatDateTime(moisture.recorded_at) })}</p>
            <p>{t('sensor.tempAt', { when: formatDateTime(temp.recorded_at) })}</p>
          </div>
        ) : (
          <p className="mt-1 font-mono text-base text-ink">{lastAt ? formatDateTime(lastAt) : t('common.noDate')}</p>
        )}
        <div className="mt-2">
          <SourceBadge kind="sensor" />
        </div>
      </div>

      <div>
        <Button variant="ghost" onClick={() => setShowTech((v) => !v)} aria-expanded={showTech} className="!px-0">
          {showTech ? t('sensor.hideTech') : t('sensor.showTech')}
        </Button>
        {showTech && (
          <div className="mt-2 border border-line bg-bg p-4">
            <Eyebrow tone="ambar">{t('sensor.rawTitle')}</Eyebrow>
            <p className="mt-1 font-mono text-base text-ink">
              {moisture?.raw_value ?? t('common.noData')} {moisture?.raw_value != null && t('sensor.rawUnits')}
              {moisture ? ` · ${formatDateTime(moisture.recorded_at)}` : ''}
            </p>
            {moisture && (
              <p className="mt-1 font-mono text-base text-muted">
                {t('sensor.receivedByApi', {
                  when: formatDateTime(moisture.received_at),
                  quality: moisture.quality_flag ?? t('common.noData').toLowerCase(),
                })}
              </p>
            )}
            <p className="mt-1 text-muted">{t('sensor.sourceNote', { source: sourceDetail })}</p>
          </div>
        )}
      </div>
    </div>
  )
}
