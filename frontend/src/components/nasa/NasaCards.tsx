import type { NasaObservation } from '../../types/api'
import { formatDay } from '../../utils/format'
import { EmptyState } from '../ui/EmptyState'
import { StatCard } from '../ui/StatCard'

export function nasaSeries(obs: NasaObservation[], variable: string): NasaObservation[] {
  return obs
    .filter((o) => o.variable === variable && o.value !== null)
    .sort((a, b) => a.observed_on.localeCompare(b.observed_on))
}

const SOURCE_DETAIL = 'Modelo de escala regional'

export function NasaCards({ observations }: { observations: NasaObservation[] }) {
  const temp = nasaSeries(observations, 'T2M')
  const rain = nasaSeries(observations, 'PRECTOTCORR')

  if (temp.length === 0 && rain.length === 0) {
    return (
      <EmptyState
        tone="insufficient"
        title="Datos insuficientes: aún no hay clima NASA POWER guardado para esta parcela"
        message="Usa «Actualizar clima» para consultarlo. Si NASA no responde, no mostramos valores de relleno."
      />
    )
  }

  const period = (s: NasaObservation[]) =>
    s.length ? `${formatDay(s[0].observed_on)} a ${formatDay(s[s.length - 1].observed_on)}` : null

  const avgTemp = temp.length ? temp.reduce((a, o) => a + (o.value as number), 0) / temp.length : null
  const totalRain = rain.length ? rain.reduce((a, o) => a + (o.value as number), 0) : null
  const lastTemp = temp[temp.length - 1]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      <StatCard
        label="Temperatura del aire (promedio)"
        value={avgTemp}
        unit="°C"
        when={period(temp)}
        source="nasa"
        sourceDetail={SOURCE_DETAIL}
        note={lastTemp ? `Último día: ${formatDay(lastTemp.observed_on)}. Aire a 2 m, no suelo.` : undefined}
      />
      <StatCard
        label="Lluvia acumulada del período"
        value={totalRain}
        unit="mm"
        when={period(rain)}
        source="nasa"
        sourceDetail={SOURCE_DETAIL}
      />
    </div>
  )
}
