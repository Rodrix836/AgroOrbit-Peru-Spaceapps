import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { NasaView } from '../../hooks/useNasa'
import type { NasaObservation } from '../../types/api'
import { formatDay, formatDayShort, formatNumber } from '../../utils/format'
import { Eyebrow } from '../ui/Eyebrow'
import { SourceBadge } from '../ui/SourceBadge'
import { AXIS_TICK, GRID_STROKE, TOOLTIP_STYLE } from '../ui/styles'
import { nasaSeries } from './NasaCards'
import { useLanguage } from '../../i18n/LanguageContext'

/** Dos tonos de azul y dos trazos distintos: la capa superficial en azul claro y continua, la zona de raíces en azul más oscuro y punteada. */
const VARIABLES = [
  { key: 'GWETTOP', labelKey: 'nasa.soil.top', stroke: '#a9d6ff', dash: undefined },
  { key: 'GWETROOT', labelKey: 'nasa.soil.root', stroke: '#4a86e0', dash: '6 4' },
] as const

/** Muestra del trazo de una serie (color y continuo/punteado), para la leyenda y las tarjetas. */
function LineSample({ stroke, dash }: { stroke: string; dash?: string }) {
  return (
    <svg aria-hidden width="32" height="10" viewBox="0 0 32 10" className="shrink-0">
      <line x1="1" y1="5" x2="31" y2="5" stroke={stroke} strokeWidth="2.5" strokeDasharray={dash} />
    </svg>
  )
}

/** true si la API trajo alguna de estas variables (aunque sea con días sin dato). Si no, el bloque no se muestra. */
export function hasSoilModel(observations: NasaObservation[]): boolean {
  return observations.some((o) => o.variable === 'GWETTOP' || o.variable === 'GWETROOT')
}

/** Fracción siempre con 2 decimales (0.30, no 0.3). */
const fraction = (v: number) => v.toFixed(2)
const percent = (v: number) => `${formatNumber(v * 100, 0)} %`

const MARGIN = { top: 5, right: 32, left: 8, bottom: 5 }

/**
 * «Humedad del suelo según NASA (modelo)»: GWETTOP y GWETROOT, fracción de saturación (0 a 1).
 * Es un modelo regional: va aparte, con su propia escala y fuente, y nunca junto a la humedad del sensor ESP32.
 */
export function NasaSoilMoisture({
  observations,
  view,
  sensorIsTest,
  example = false,
}: {
  observations: NasaObservation[]
  view: NasaView
  /** true = la última lectura del sensor es de un kit de prueba. */
  sensorIsTest: boolean
  example?: boolean
}) {
  const { t } = useLanguage()
  if (!hasSoilModel(observations)) return null

  // Un registro por día del período; el día sin dato queda vacío (null), no en 0.
  const byDay = new Map<string, { day: string; GWETTOP: number | null; GWETROOT: number | null }>()
  for (const o of observations) {
    if (o.variable !== 'GWETTOP' && o.variable !== 'GWETROOT') continue
    const row = byDay.get(o.observed_on) ?? { day: o.observed_on, GWETTOP: null, GWETROOT: null }
    row[o.variable] = o.value
    byDay.set(o.observed_on, row)
  }
  const data = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day))
  const latest = (key: 'GWETTOP' | 'GWETROOT') => nasaSeries(observations, key).pop() ?? null
  const hasValues = VARIABLES.some((v) => latest(v.key) !== null)

  return (
    <div className="space-y-4 border-t border-line pt-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Eyebrow tone="cielo">{t('nasa.soil.title')}</Eyebrow>
        <SourceBadge kind="nasa" />
        {example && <SourceBadge kind="prototype" label={t('common.exampleData')} />}
      </div>

      <p className="font-mono text-base text-muted">
        {t('nasa.cards.range', { label: view.period.label, from: formatDay(view.from), to: formatDay(view.to) })}
      </p>

      {hasValues ? (
        <>
          <dl>
            {VARIABLES.map((v) => {
              const last = latest(v.key)
              return (
                <div key={v.key} className="border-t border-line py-3">
                  <dt className="flex items-center gap-3 whitespace-nowrap text-ink">
                    <LineSample stroke={v.stroke} dash={v.dash} />
                    {t(v.labelKey)}
                  </dt>
                  <dd className="mt-1 whitespace-nowrap font-mono text-lg" style={{ color: v.stroke }}>
                    {last ? (
                      <>
                        {fraction(last.value as number)} <span className="text-muted">·</span> {percent(last.value as number)}{' '}
                        <span className="text-base text-muted">{t('nasa.soil.saturation')}</span>
                      </>
                    ) : (
                      <span className="text-muted">{t('common.noData')}</span>
                    )}
                  </dd>
                  {last && (
                    <p className="mt-1 font-mono text-base text-muted">
                      {t('nasa.soil.lastData', { day: formatDay(last.observed_on) })}
                    </p>
                  )}
                </div>
              )
            })}
          </dl>

          <div>
            <Eyebrow tone="cielo">{t('nasa.soil.chartTitle')}</Eyebrow>
            <div className="mt-3 h-56 w-full">
              <ResponsiveContainer>
                <LineChart data={data} margin={MARGIN}>
                  <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="day" tickFormatter={formatDayShort} minTickGap={50} tick={AXIS_TICK} stroke="#3a4b41" />
                  <YAxis
                    domain={[0, 1]}
                    ticks={[0, 0.25, 0.5, 0.75, 1]}
                    tickFormatter={(t: number) => formatNumber(t, 2)}
                    tick={AXIS_TICK}
                    width={48}
                    stroke="#3a4b41"
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(d) => formatDay(String(d))}
                    formatter={(v, name) => [
                      v == null ? t('nasa.chart.noData') : `${fraction(Number(v))} (${percent(Number(v))})`,
                      String(name),
                    ]}
                  />
                  {VARIABLES.map((v) => (
                    <Line
                      key={v.key}
                      type="monotone"
                      dataKey={v.key}
                      name={t(v.labelKey)}
                      stroke={v.stroke}
                      strokeDasharray={v.dash}
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-base text-ink">
              {VARIABLES.map((v) => (
                <li key={v.key} className="flex items-center gap-2">
                  <LineSample stroke={v.stroke} dash={v.dash} />
                  {t(v.labelKey)}
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <p className="text-muted">{t('nasa.soil.noData')}</p>
      )}

      <p className="text-muted">
        {t('nasa.soil.note')}
        {sensorIsTest && ` ${t('nasa.soil.sensorTest')}`}
      </p>
    </div>
  )
}
