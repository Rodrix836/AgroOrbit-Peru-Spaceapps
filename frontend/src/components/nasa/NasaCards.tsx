import type { NasaObservation } from '../../types/api'
import { formatDay, formatNumber } from '../../utils/format'
import { EmptyState } from '../ui/EmptyState'
import { Eyebrow } from '../ui/Eyebrow'
import { SourceBadge } from '../ui/SourceBadge'

export function nasaSeries(obs: NasaObservation[], variable: string): NasaObservation[] {
  return obs
    .filter((o) => o.variable === variable && o.value !== null)
    .sort((a, b) => a.observed_on.localeCompare(b.observed_on))
}

const sum = (s: NasaObservation[]) => s.reduce((a, o) => a + (o.value as number), 0)
const mean = (s: NasaObservation[]) => sum(s) / s.length

function Row({ label, value, unit }: { label: string; value: string | null; unit?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-line py-3">
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
  )
}

export function NasaCards({ observations }: { observations: NasaObservation[] }) {
  const temp = nasaSeries(observations, 'T2M')
  const tmin = nasaSeries(observations, 'T2M_MIN')
  const tmax = nasaSeries(observations, 'T2M_MAX')
  const rain = nasaSeries(observations, 'PRECTOTCORR')
  const rh = nasaSeries(observations, 'RH2M')
  const sun = nasaSeries(observations, 'ALLSKY_SFC_SW_DWN')

  if (observations.every((o) => o.value === null) || observations.length === 0) {
    return (
      <EmptyState
        tone="insufficient"
        title="Aún no hay clima NASA POWER guardado para esta parcela"
        message="Usa «Actualizar clima» para consultarlo. Si NASA no responde, no mostramos valores de relleno."
      />
    )
  }

  const all = [...temp, ...tmin, ...tmax, ...rain, ...rh, ...sun].sort((a, b) =>
    a.observed_on.localeCompare(b.observed_on),
  )
  const period = all.length
    ? `${formatDay(all[0].observed_on)} a ${formatDay(all[all.length - 1].observed_on)}`
    : null

  const minOfMin = tmin.length ? Math.min(...tmin.map((o) => o.value as number)) : null
  const maxOfMax = tmax.length ? Math.max(...tmax.map((o) => o.value as number)) : null

  return (
    <div>
      <dl>
        <Row
          label="Lluvia acumulada"
          value={rain.length ? formatNumber(sum(rain), 1) : null}
          unit={rain[0]?.unit.replace('/día', '') ?? 'mm'}
        />
        <Row
          label="Temperatura media del aire"
          value={temp.length ? formatNumber(mean(temp), 1) : null}
          unit={temp[0]?.unit ?? '°C'}
        />
        <Row
          label="Temperatura mínima / máxima"
          value={
            minOfMin !== null && maxOfMax !== null
              ? `${formatNumber(minOfMin, 1)} / ${formatNumber(maxOfMax, 1)}`
              : null
          }
          unit={tmin[0]?.unit ?? tmax[0]?.unit ?? '°C'}
        />
        <Row
          label="Humedad relativa media"
          value={rh.length ? formatNumber(mean(rh), 0) : null}
          unit={rh[0]?.unit ?? '%'}
        />
        <Row
          label="Radiación solar media"
          value={sun.length ? formatNumber(mean(sun), 1) : null}
          unit={sun[0]?.unit}
        />
      </dl>
      <div className="border-t border-line pt-4">
        <Eyebrow>Período</Eyebrow>
        <p className="mt-1 font-mono text-base text-ink">{period ?? 'Sin fecha'}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <SourceBadge kind="nasa" />
          <span className="text-muted">Modelo de escala regional · temperatura del aire a 2 m, no del suelo</span>
        </div>
      </div>
    </div>
  )
}
