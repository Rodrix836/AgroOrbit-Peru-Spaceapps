import type { RecommendationContext } from '../../types/api'
import { formatDateTime, formatDay, formatNumber } from '../../utils/format'
import { TestBadge } from '../sensors/QualityNotice'
import { Alert } from '../ui/Alert'
import { Eyebrow } from '../ui/Eyebrow'
import { SourceBadge } from '../ui/SourceBadge'

function num(v: number | string | null | undefined): number | null {
  return typeof v === 'number' ? v : null
}

function Row({ label, value, unit, detail }: { label: string; value: number | null; unit: string; detail?: string }) {
  return (
    <div className="border-t border-line py-3">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-ink">{label}</dt>
        <dd className="text-right font-mono text-lg text-cielo">
          {value === null ? (
            <span className="text-muted">Sin dato</span>
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
  return valid !== null && total !== null ? `${valid} de ${total} días con dato` : undefined
}

/**
 * Bloque «Con qué datos se calculó»: aviso, NASA POWER y sensor, siempre separados.
 * PENDIENTE BACKEND: formato propuesto en el PR #7 (pendiente de confirmar por Milene).
 */
export function ContextPanel({
  context,
  createdAt,
  example = false,
}: {
  context: RecommendationContext
  /** created_at de la respuesta (ISO 8601 UTC). */
  createdAt?: string
  example?: boolean
}) {
  const { power, sensor } = context
  const ind = power?.indicators ?? {}
  const days = num(ind.dias_analizados)

  return (
    <section className="mb-8 border border-line bg-panel p-6 md:p-8" aria-label="Con qué datos se calculó">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Eyebrow tone="lima">Con qué datos se calculó</Eyebrow>
        {/* PENDIENTE BACKEND: mientras la respuesta salga de mocks, las cifras no son reales. */}
        {example && <SourceBadge kind="prototype" label="Datos de ejemplo" />}
      </div>
      {context.notice && (
        <div className="mb-6">
          <Alert tone="warn" title="Aviso">
            {context.notice}
          </Alert>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        {/* CONTEXTO REGIONAL: NASA POWER */}
        {power && (
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Eyebrow tone="cielo">Clima de la zona</Eyebrow>
              <SourceBadge kind="nasa" label={power.source} />
            </div>
            <p className="font-mono text-base text-ink">
              Período: {formatDay(power.start)} a {formatDay(power.end)}
            </p>
            <p className="mt-1 text-muted">
              {power.use === 'contexto_del_periodo'
                ? 'Contexto reciente, no un histórico.'
                : 'Histórico del período indicado.'}{' '}
              Días en hora solar local ({power.time_standard}) de NASA POWER; no es una medición sobre tu parcela.
            </p>
            <dl className="mt-3">
              <Row
                label="Temperatura promedio del aire"
                value={num(ind.temperatura_promedio_c)}
                unit="°C"
                detail={coverage(num(ind.dias_temperatura_validos), days)}
              />
              <Row
                label="Lluvia total"
                value={num(ind.precipitacion_total_mm)}
                unit="mm"
                detail={coverage(num(ind.dias_precipitacion_validos), days)}
              />
            </dl>
          </div>
        )}

        {/* MEDICIÓN PUNTUAL: sensor ESP32 */}
        {sensor && (
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Eyebrow tone="ambar">Suelo</Eyebrow>
              <SourceBadge kind="sensor" />
              {sensor.quality_flag === 'test' && <TestBadge />}
            </div>
            <p className="font-medium text-ink">
              {sensor.used_as_evidence
                ? 'Las lecturas del sensor se usaron como evidencia.'
                : 'Las lecturas del sensor no se usaron como evidencia.'}
            </p>
            {sensor.reason && <p className="mt-1 text-muted">{sensor.reason}</p>}
          </div>
        )}
      </div>
      {createdAt && (
        <p className="mt-6 border-t border-line pt-3 font-mono text-base text-muted">
          Calculado: {formatDateTime(createdAt)} (hora de Perú)
        </p>
      )}
    </section>
  )
}
