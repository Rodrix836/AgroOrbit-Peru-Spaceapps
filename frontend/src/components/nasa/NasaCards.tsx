import type { NasaObservation } from '../../types/api'
import { displayUnit, formatDay, formatNumber } from '../../utils/format'
import { EmptyState } from '../ui/EmptyState'
import { Eyebrow } from '../ui/Eyebrow'
import { SourceBadge } from '../ui/SourceBadge'

/** Texto fijo bajo los datos: POWER publica con retraso. */
export const NASA_DELAY_NOTE =
  'Los últimos 3 o 4 días pueden faltar porque NASA POWER publica con retraso.'

/** Observaciones de una variable que sí tienen valor (value null = sin dato, no se usa). */
export function nasaSeries(obs: NasaObservation[], variable: string): NasaObservation[] {
  return obs
    .filter((o) => o.variable === variable && o.value !== null)
    .sort((a, b) => a.observed_on.localeCompare(b.observed_on))
}

const sum = (s: NasaObservation[]) => s.reduce((a, o) => a + (o.value as number), 0)
const mean = (s: NasaObservation[]) => sum(s) / s.length

function Row({
  label,
  value,
  unit,
  detail,
}: {
  label: string
  value: string | null
  unit?: string
  detail?: string
}) {
  return (
    <div className="border-t border-line py-3">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-ink">{label}</dt>
        <dd className="text-right font-mono text-lg text-cielo">
          {value === null ? (
            <span className="text-muted">Sin dato</span>
          ) : (
            <>
              {value}
              {unit && <span className="ml-1.5 text-base text-muted">{unit}</span>}
            </>
          )}
        </dd>
      </div>
      {detail && <p className="mt-1 font-mono text-base text-muted">{detail}</p>}
    </div>
  )
}

/** Cuántos días tiene la variable y cuántos de ellos traen valor. */
function coverage(obs: NasaObservation[], variable: string): string {
  const all = obs.filter((o) => o.variable === variable)
  const valid = all.filter((o) => o.value !== null)
  return `${valid.length} de ${all.length} días con dato`
}

/** Solo T2M y PRECTOTCORR, que son las variables que entrega la API hoy. */
export function NasaCards({ observations }: { observations: NasaObservation[] }) {
  const temp = nasaSeries(observations, 'T2M')
  const rain = nasaSeries(observations, 'PRECTOTCORR')

  if (observations.length === 0 || (temp.length === 0 && rain.length === 0)) {
    return (
      <EmptyState
        tone="insufficient"
        title="Aún no hay clima NASA POWER guardado para esta parcela"
        message="Usa «Actualizar clima» para consultarlo. Si NASA no responde, no mostramos valores de relleno."
      />
    )
  }

  const days = [...new Set(observations.map((o) => o.observed_on))].sort()
  const lastValid = [...temp, ...rain]
    .map((o) => o.observed_on)
    .sort()
    .pop()
  const period = `${formatDay(days[0])} a ${formatDay(days[days.length - 1])}`

  return (
    <div>
      <dl>
        <Row
          label="Temperatura media del aire"
          value={temp.length ? formatNumber(mean(temp), 1) : null}
          unit={displayUnit(temp[0]?.unit ?? 'C')}
          detail={coverage(observations, 'T2M')}
        />
        <Row
          label="Lluvia acumulada"
          value={rain.length ? formatNumber(sum(rain), 1) : null}
          unit="mm"
          detail={`${coverage(observations, 'PRECTOTCORR')} · suma de ${displayUnit(rain[0]?.unit ?? 'mm/day')}`}
        />
      </dl>
      <div className="border-t border-line pt-4">
        <Eyebrow>Período</Eyebrow>
        <p className="mt-1 font-mono text-base text-ink">{period}</p>
        <p className="mt-1 font-mono text-base text-muted">
          Último día con dato: {lastValid ? formatDay(lastValid) : 'Sin fecha'}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <SourceBadge kind="nasa" />
          <span className="text-muted">
            Modelo de escala regional · temperatura del aire a 2 m, no del suelo · días en hora solar local
            de POWER
          </span>
        </div>
        <p className="mt-3 text-muted">{NASA_DELAY_NOTE}</p>
      </div>
    </div>
  )
}
