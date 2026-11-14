import type { NasaObservation } from '../../types/api'
import { formatDay } from '../../utils/format'
import { DataStat } from '../ui/DataStat'
import { EmptyState } from '../ui/EmptyState'

export function nasaSeries(obs: NasaObservation[], variable: string): NasaObservation[] {
  return obs
    .filter((o) => o.variable === variable && o.value !== null)
    .sort((a, b) => a.observed_on.localeCompare(b.observed_on))
}

export function NasaCards({ observations }: { observations: NasaObservation[] }) {
  const temp = nasaSeries(observations, 'T2M')
  const rain = nasaSeries(observations, 'PRECTOTCORR')

  if (temp.length === 0 && rain.length === 0) {
    return (
      <EmptyState
        tone="warning"
        title="Datos insuficientes: aún no hay clima NASA POWER guardado para esta parcela"
        message="Usa «Actualizar clima NASA» para consultarlo. Si NASA no responde, no mostramos valores de relleno."
      />
    )
  }

  const period = (s: NasaObservation[]) =>
    s.length ? `${formatDay(s[0].observed_on)} a ${formatDay(s[s.length - 1].observed_on)}` : null

  const avgTemp = temp.length ? temp.reduce((a, o) => a + (o.value as number), 0) / temp.length : null
  const totalRain = rain.length ? rain.reduce((a, o) => a + (o.value as number), 0) : null
  const lastTemp = temp[temp.length - 1]

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <DataStat
        label="Temperatura del aire (promedio del período)"
        value={avgTemp}
        unit="°C"
        when={period(temp)}
        source="NASA POWER (modelo, escala regional)"
        kind="nasa"
        note={lastTemp ? `Último día: ${formatDay(lastTemp.observed_on)}. Aire a 2 m, no suelo.` : undefined}
      />
      <DataStat
        label="Lluvia acumulada del período"
        value={totalRain}
        unit="mm"
        when={period(rain)}
        source="NASA POWER (modelo, escala regional)"
        kind="nasa"
      />
    </div>
  )
}
