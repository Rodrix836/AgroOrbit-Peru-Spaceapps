import type { Priority, RecommendationContext } from '../../types/api'
import { formatDateTime, formatDay, formatNumber } from '../../utils/format'
import { daysBetween } from '../../utils/period'
import { utcDaysAgo } from '../../utils/powerGrid'
import { LocationMap } from '../plot/LocationMap'
import type { MapOverlay } from '../plot/PlotMap'
import { TestBadge } from '../sensors/QualityNotice'
import { Alert } from '../ui/Alert'
import { Eyebrow } from '../ui/Eyebrow'
import { SourceBadge } from '../ui/SourceBadge'
import { useLanguage } from '../../i18n/LanguageContext'
import { tr } from '../../i18n/active'
import { td } from '../../i18n/dataText'

/**
 * Imagen de NASA GIBS que acompaña a cada prioridad. Capas, juego de teselas y formato comprobados en el
 * GetCapabilities de GIBS (15/11/2026); las dos se publican a diario, con unos días de retraso.
 */
const PRIORITY_LAYERS: Record<Priority, Omit<MapOverlay, 'date'>> = {
  save_water: {
    layer: 'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture',
    matrixSet: 'GoogleMapsCompatible_Level6',
    maxNativeZoom: 6,
    ext: 'png',
    opacity: 0.75,
  },
  improve_soil: {
    layer: 'MODIS_Terra_NDVI_8Day',
    matrixSet: 'GoogleMapsCompatible_Level9',
    maxNativeZoom: 9,
    ext: 'png',
    opacity: 0.75,
  },
}
/** La imagen de hoy puede no estar publicada todavía: se pide la de hace 4 días (UTC). */
const PRIORITY_MAP_DAYS_AGO = 4

/** Mapa de la zona con la imagen de NASA que corresponde a la prioridad elegida. Es contexto visual, sin cifras. */
function PriorityMap({ priority, lat, lng }: { priority: Priority; lat: number; lng: number }) {
  const { t } = useLanguage()
  const date = utcDaysAgo(PRIORITY_MAP_DAYS_AGO)
  const water = priority === 'save_water'
  return (
    <div className="mt-6">
      {/* key: al cambiar la prioridad el mapa se vuelve a montar con la otra imagen. */}
      <LocationMap key={priority} lat={lat} lng={lng} overlay={{ ...PRIORITY_LAYERS[priority], date }} overlayOn compact />
      <p className="mt-3 font-medium text-ink">{t(water ? 'ctx.mapWater' : 'ctx.mapSoil')}</p>
      <p className="mt-1 font-mono text-base text-muted">
        {t(water ? 'ctx.mapWaterSource' : 'ctx.mapSoilSource', { date: formatDay(date) })}
      </p>
      <p className="mt-1 text-muted">{t('ctx.mapNote')}</p>
    </div>
  )
}

function num(v: number | string | null | undefined): number | null {
  return typeof v === 'number' ? v : null
}

function Row({ label, value, unit, detail }: { label: string; value: number | null; unit: string; detail?: string }) {
  const { t } = useLanguage()
  return (
    <div className="border-t border-line py-3">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-ink">{label}</dt>
        <dd className="text-right font-mono text-lg text-cielo">
          {value === null ? (
            <span className="text-muted">{t('common.noData')}</span>
          ) : (
            <>
              {formatNumber(value, 1)}
              <span className="ml-1.5 text-base text-muted">{unit}</span>
            </>
          )}
        </dd>
      </div>
      {detail && <p className="mt-1 font-mono text-base text-muted">{detail}</p>}
    </div>
  )
}

/** "X de Y días con dato", solo si llegan los dos números. */
function coverage(valid: number | null, total: number | null): string | undefined {
  return valid !== null && total !== null ? tr('ctx.coverage', { valid, total }) : undefined
}

/**
 * Bloque «Con qué datos se calculó»: aviso, NASA POWER y sensor, siempre separados.
 * PENDIENTE BACKEND: formato propuesto en el PR #7 (pendiente de confirmar por Milene).
 */
export function ContextPanel({
  context,
  createdAt,
  example = false,
  title,
  powerTitle,
  powerNote,
  priority,
  lat,
  lng,
}: {
  context: RecommendationContext
  /** created_at de la respuesta (ISO 8601 UTC). */
  createdAt?: string
  example?: boolean
  /** Título del bloque. */
  title?: string
  /** Título de la parte de NASA POWER. */
  powerTitle?: string
  /** Texto bajo los datos de NASA POWER (p. ej. de dónde sale el histórico). */
  powerNote?: string
  /** Prioridad elegida: decide la imagen de NASA del mapa. */
  priority?: Priority
  /** Coordenadas de la parcela. Sin ellas (o sin prioridad) no se muestra el mapa. */
  lat?: number | null
  lng?: number | null
}) {
  const { t } = useLanguage()
  const heading = title ?? t('ctx.title')
  const powerHeading = powerTitle ?? t('ctx.powerTitle')
  const { power, sensor } = context
  const mapPriority = priority ?? null
  const showMap = mapPriority !== null && typeof lat === 'number' && typeof lng === 'number'
  const ind = power?.indicators ?? {}
  const days = num(ind.dias_analizados)
  const rainTotal = num(ind.precipitacion_total_mm)
  const rainValid = num(ind.dias_precipitacion_validos)
  // Promedio anual = lluvia total ÷ años del período. Solo tiene sentido con un período de un año o más.
  const periodDays = power ? daysBetween(power.start, power.end) : 0
  const years = periodDays / 365.25
  const annualRain = rainTotal !== null && periodDays >= 365 ? rainTotal / years : null
  const partial = rainValid !== null && days !== null && rainValid < days

  return (
    <section className="mb-8 border border-line bg-panel p-6 md:p-8" aria-label={heading}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Eyebrow tone="lima">{heading}</Eyebrow>
        {/* PENDIENTE BACKEND: mientras la respuesta salga de mocks, las cifras no son reales. */}
        {example && <SourceBadge kind="prototype" label={t('common.exampleData')} />}
      </div>
      {context.notice && (
        <div className="mb-6">
          <Alert tone="warn" title={t('ctx.notice')}>
            {td(context.notice)}
          </Alert>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        {/* CONTEXTO REGIONAL: NASA POWER */}
        {power && (
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Eyebrow tone="cielo">{powerHeading}</Eyebrow>
              <SourceBadge kind="nasa" label={power.source} />
            </div>
            {power.use === 'historico' ? (
              <p className="font-mono text-base text-ink">
                {t('ctx.history', { from: formatDay(power.start), to: formatDay(power.end) })}
              </p>
            ) : (
              <p className="font-mono text-base text-ink">
                {t('ctx.period', { from: formatDay(power.start), to: formatDay(power.end) })}
              </p>
            )}
            <p className="mt-1 text-muted">
              {power.use === 'contexto_del_periodo' && `${t('ctx.recentContext')} `}
              {t('ctx.powerNote', { tz: power.time_standard })}
            </p>
            <dl className="mt-3">
              <Row
                label={t('ctx.airTemp')}
                value={num(ind.temperatura_promedio_c)}
                unit="°C"
                detail={coverage(num(ind.dias_temperatura_validos), days)}
              />
              <Row
                label={t('ctx.rainTotal')}
                value={rainTotal}
                unit="mm"
                detail={coverage(rainValid, days)}
              />
              {annualRain !== null && (
                <Row
                  label={t('ctx.rainAnnual')}
                  value={annualRain}
                  unit={t('ctx.perYear')}
                  detail={`${t('ctx.annualNote', { years: formatNumber(years, 1) })}${partial ? t('ctx.annualPartial') : ''}`}
                />
              )}
            </dl>
            {powerNote && <p className="mt-3 text-muted">{powerNote}</p>}
          </div>
        )}

        {/* MEDICIÓN PUNTUAL: sensor ESP32 y, debajo, la imagen de NASA de la zona según la prioridad */}
        {(sensor || showMap) && (
          <div className="min-w-0">
            {sensor && (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Eyebrow tone="ambar">{t('ctx.soil')}</Eyebrow>
                  <SourceBadge kind="sensor" />
                  {sensor.quality_flag === 'test' && <TestBadge />}
                </div>
                <p className="font-medium text-ink">
                  {sensor.used_as_evidence
                    ? t('ctx.sensorUsed')
                    : t('ctx.sensorNotUsed')}
                </p>
                {sensor.reason && <p className="mt-1 text-muted">{td(sensor.reason)}</p>}
              </>
            )}
            {showMap && <PriorityMap priority={mapPriority} lat={lat} lng={lng} />}
          </div>
        )}
      </div>
      {createdAt && (
        <p className="mt-6 border-t border-line pt-3 font-mono text-base text-muted">
          {t('ctx.calculated', { when: formatDateTime(createdAt) })}
        </p>
      )}
    </section>
  )
}
