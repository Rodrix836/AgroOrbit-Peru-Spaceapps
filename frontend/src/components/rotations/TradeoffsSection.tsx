import type { ReactNode } from 'react'
import type { Crop } from '../../types/api'
import type { ScenarioCardModel } from '../../types/scenario'
import { USE_MOCKS } from '../../services/api'
import { formatNumber } from '../../utils/format'
import { formatDay, formatFixed } from '../../utils/format'
import { daysBetween } from '../../utils/period'
import { sameSpanNote, tradeoffSentences, YEAR_DAYS, type TradeoffRow, type Tradeoffs } from '../../utils/tradeoffs'
import type { RangeStat } from '../../utils/windowStats'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { Eyebrow } from '../ui/Eyebrow'
import { Loading } from '../ui/Loading'
import { SourceBadge } from '../ui/SourceBadge'
import { labelClass } from '../ui/styles'
import { cropName } from './labels'
import { RangeBar, ValueBar } from './RangeBar'

const GRID = 'lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-x-6'

const NO_HISTORY = 'Histórico insuficiente para estas fechas'

/** Una celda: en celular lleva su rótulo encima; en pantalla ancha el rótulo está en el encabezado de la tabla. */
function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 py-3 lg:py-0">
      <p className={`mb-1 text-muted lg:hidden ${labelClass}`}>{label}</p>
      {children}
    </div>
  )
}

function Insufficient() {
  return (
    <div className="border border-dashed border-edge p-3">
      <p className="font-medium text-ink">{NO_HISTORY}</p>
    </div>
  )
}

const CAMP_GRID = 'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1.3fr)] lg:gap-x-6'

/** «36 – 103 – 630 mm» (mín – mediana – máx) con los años usados; o «Histórico insuficiente para estas fechas». */
function RangeText({ stat, unit, decimals }: { stat: RangeStat; unit: string; decimals: number }) {
  if (!stat.sufficient) return <Insufficient />
  const f = (v: number | null) => (decimals > 0 ? formatFixed(v ?? 0, decimals) : formatNumber(v ?? 0, 0))
  return (
    <div>
      <p className="font-mono text-base text-cielo">
        {f(stat.min)} – {f(stat.median)} – {f(stat.max)} <span className="text-muted">{unit}</span>
      </p>
      <p className="font-mono text-[13px] text-muted">{stat.n} años válidos</p>
    </div>
  )
}

/**
 * Segunda tabla, «Por campaña»: una fila por campaña, agrupada por estrategia (cultivo, fechas, lluvia y temperatura
 * históricas en esas fechas). Ahí se distinguen las estrategias que ocupan las mismas fechas en total.
 */
function CampaignTable({ cards, crops, rows }: { cards: ScenarioCardModel[]; crops: Crop[]; rows: TradeoffRow[] }) {
  return (
    <div className="mt-8" role="table" aria-label="Por campaña">
      <h3 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-ink">Por campaña</h3>
      <p className="mt-1 max-w-prose text-muted">
        Cada campaña con sus propias fechas: mínimo – mediana – máximo entre años. Las alternativas con las mismas fechas en
        total se distinguen aquí.
      </p>

      <div role="row" className={`mt-4 hidden border-b border-line pb-2 ${CAMP_GRID}`}>
        {['Cultivo', 'Fechas', 'Lluvia (mm): mín – mediana – máx', 'Temperatura (°C): mín – mediana – máx'].map((h) => (
          <p key={h} role="columnheader" className={`text-muted ${labelClass}`}>
            {h}
          </p>
        ))}
      </div>

      {rows.map((r) => {
        const card = cards.find((c) => c.id === r.id)
        if (!card) return null
        return (
          <div key={r.id} role="rowgroup" className="mt-4 border border-line p-4 lg:border-x-0 lg:border-b lg:border-t-0 lg:p-0 lg:pb-3">
            <Eyebrow tone={r.role === 'reference' ? 'muted' : 'cielo'} className="lg:pt-2">
              {r.nombre}
            </Eyebrow>
            {card.alt.campaigns.map((c, i) => {
              const st = r.stats.campaigns[i]
              return (
                <div key={i} role="row" className={`mt-3 border-t border-line pt-3 lg:mt-2 lg:border-t-0 lg:pt-0 ${CAMP_GRID}`}>
                  <div role="cell" className="min-w-0">
                    <Cell label="Cultivo">
                      <p className="font-medium text-ink">
                        Campaña {i + 1} · {cropName(c.crop, crops)}
                      </p>
                    </Cell>
                  </div>
                  <div role="cell" className="min-w-0">
                    <Cell label="Fechas">
                      <p className="font-mono text-base text-ink">
                        {formatDay(c.starts_on)} – {formatDay(c.ends_on)}
                      </p>
                      <p className="font-mono text-base text-muted">{daysBetween(c.starts_on, c.ends_on)} días</p>
                    </Cell>
                  </div>
                  <div role="cell" className="min-w-0">
                    <Cell label="Lluvia (mm): mín – mediana – máx">
                      {st ? <RangeText stat={st.rain} unit="mm" decimals={0} /> : <Insufficient />}
                    </Cell>
                  </div>
                  <div role="cell" className="min-w-0">
                    <Cell label="Temperatura (°C): mín – mediana – máx">
                      {st ? <RangeText stat={st.temp} unit="°C" decimals={1} /> : <Insufficient />}
                    </Cell>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

/** Escala común (mín, máx) de una columna: la misma para las tres filas. */
function scaleOf(values: number[], fromZero: boolean): [number, number] | null {
  if (values.length === 0) return null
  const hi = Math.max(...values)
  const lo = Math.min(...values)
  if (fromZero) return [0, Math.max(10, Math.ceil(hi / 10) * 10)]
  return [Math.floor(lo - 0.5), Math.ceil(hi + 0.5)]
}

/**
 * «Compensaciones entre estrategias»: duración, lluvia y temperatura históricas en las mismas fechas de cada estrategia
 * (T2M y PRECTOTCORR reales de NASA POWER) y qué tanto cambió la lluvia de un año a otro. Un solo tono (azul NASA): sin
 * colores de bueno o malo. Todo es cálculo del frontend; no hay un puntaje ni una ganadora.
 */
export function TradeoffsSection({
  cards,
  crops,
  tradeoffs,
  loading,
  error,
  onRetry,
}: {
  cards: ScenarioCardModel[]
  crops: Crop[]
  /** null mientras carga o si falló. */
  tradeoffs: Tradeoffs | null
  loading: boolean
  error: string | null
  onRetry: () => void
}) {
  const rows = tradeoffs?.rows ?? []
  const sentences = tradeoffs ? tradeoffSentences(rows) : []
  const sameSpanText = tradeoffs ? sameSpanNote(rows) : null

  // Misma escala en las tres filas de cada columna.
  const rainScale = scaleOf(
    rows.flatMap((r) => (r.stats.rain.sufficient ? [r.stats.rain.min as number, r.stats.rain.max as number] : [])),
    true,
  )
  const tempScale = scaleOf(
    rows.flatMap((r) => (r.stats.temp.sufficient ? [r.stats.temp.min as number, r.stats.temp.max as number] : [])),
    false,
  )
  const varValues = rows.flatMap((r) => (r.stats.variability === null ? [] : [r.stats.variability]))
  const varScale = varValues.length ? Math.max(10, Math.ceil(Math.max(...varValues) / 10) * 10) : 0

  const sequenceOf = (id: string) => {
    const card = cards.find((c) => c.id === id)
    return card ? card.alt.campaigns.map((c) => cropName(c.crop, crops)).join(' → ') : ''
  }

  const span =
    tradeoffs && tradeoffs.firstYear !== null && tradeoffs.lastYear !== null
      ? ` (${tradeoffs.firstYear}–${tradeoffs.lastYear})`
      : ''

  return (
    <section className="mt-6 border border-cielo bg-panel p-6 md:p-8" aria-label="Compensaciones entre estrategias">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <SourceBadge kind="nasa" />
        {/* Cálculo propio, separado de lo sintético («Criterio de prueba») */}
        <span className={`border border-cielo bg-cielo/10 px-2 py-0.5 text-cielo ${labelClass}`}>
          {USE_MOCKS
            ? 'Cálculo del frontend sobre datos de ejemplo'
            : 'Cálculo del frontend sobre datos reales de NASA POWER'}
        </span>
      </div>
      <h2 className="font-display text-[clamp(26px,4vw,36px)] font-extrabold leading-none tracking-[-0.03em] text-ink">
        Compensaciones entre estrategias
      </h2>
      <p className="mt-3 max-w-prose text-lg text-ink">
        Cada secuencia tiene ventajas y costos distintos. Aquí se comparan con lo que ocurrió en años anteriores en
        esas mismas fechas.
      </p>

      {loading && <Loading label="Cargando el histórico de NASA POWER…" />}

      {error && (
        <div className="mt-4">
          <Alert tone="warn" title="No se pudo cargar el histórico">
            <p>
              {error} No se pueden calcular las compensaciones. El resto del escenario sigue funcionando.
            </p>
            <Button variant="amber" className="mt-3" onClick={onRetry}>
              Reintentar
            </Button>
          </Alert>
        </div>
      )}

      {tradeoffs && rows.length > 0 && (
        <>
          {/* Tabla: en pantalla ancha una fila por estrategia; en celular, tres bloques apilados */}
          <div className="mt-6" role="table" aria-label="Compensaciones entre estrategias">
            <div role="row" className={`hidden border-b border-line pb-2 ${GRID}`}>
              <p role="columnheader" className={`text-muted ${labelClass}`}>
                Estrategia
              </p>
              <p role="columnheader" className={`text-muted ${labelClass}`}>
                Duración total (días) y días libres hasta completar los 12 meses
              </p>
              <p role="columnheader" className={`text-muted ${labelClass}`}>
                Lluvia histórica en sus fechas (mm)
              </p>
              <p role="columnheader" className={`text-muted ${labelClass}`}>
                Temperatura media histórica en sus fechas (°C)
              </p>
              <p role="columnheader" className={`text-muted ${labelClass}`}>
                Variabilidad: cambio de la lluvia entre años (máx − mín, mm)
              </p>
            </div>

            {rows.map((r: TradeoffRow) => {
              const rain = r.stats.rain
              const temp = r.stats.temp
              return (
                <div
                  key={r.id}
                  role="row"
                  className={`mb-4 border border-line p-4 lg:mb-0 lg:border-x-0 lg:border-t-0 lg:p-0 lg:py-5 ${GRID}`}
                >
                  <div role="rowheader" className="min-w-0 pb-1 lg:pb-0">
                    <Eyebrow tone={r.role === 'reference' ? 'muted' : 'cielo'}>{r.nombre}</Eyebrow>
                    <p className="mt-1 font-semibold text-ink">{sequenceOf(r.id)}</p>
                  </div>

                  <div role="cell" className="min-w-0">
                    <Cell label="Duración total y días libres">
                      <p className="font-mono text-lg text-cielo">
                        {formatNumber(r.totalDays, 0)} <span className="text-base text-muted">días</span>
                      </p>
                      <p className="font-mono text-base text-ink">
                        {formatNumber(r.freeDays, 0)} <span className="text-muted">días libres de {YEAR_DAYS}</span>
                      </p>
                    </Cell>
                  </div>

                  <div role="cell" className="min-w-0">
                    <Cell label="Lluvia histórica en sus fechas">
                      {rain.sufficient && rainScale ? (
                        <>
                          <RangeBar
                            min={rain.min as number}
                            median={rain.median as number}
                            max={rain.max as number}
                            scaleMin={rainScale[0]}
                            scaleMax={rainScale[1]}
                            unit="mm"
                            label={`Lluvia histórica de ${r.nombre}`}
                            minLabel={rain.minLabel}
                            maxLabel={rain.maxLabel}
                          />
                          <p className="font-mono text-[13px] text-muted">{rain.n} años válidos</p>
                        </>
                      ) : (
                        <Insufficient />
                      )}
                    </Cell>
                  </div>

                  <div role="cell" className="min-w-0">
                    <Cell label="Temperatura media histórica en sus fechas">
                      {temp.sufficient && tempScale ? (
                        <>
                          <RangeBar
                            min={temp.min as number}
                            median={temp.median as number}
                            max={temp.max as number}
                            scaleMin={tempScale[0]}
                            scaleMax={tempScale[1]}
                            unit="°C"
                            decimals={1}
                            label={`Temperatura media histórica de ${r.nombre}`}
                          />
                          <p className="font-mono text-[13px] text-muted">{temp.n} años válidos</p>
                        </>
                      ) : (
                        <Insufficient />
                      )}
                    </Cell>
                  </div>

                  <div role="cell" className="min-w-0">
                    <Cell label="Variabilidad de la lluvia entre años">
                      {r.stats.variability !== null && varScale > 0 ? (
                        <ValueBar
                          value={r.stats.variability}
                          scaleMax={varScale}
                          unit="mm"
                          label={`Variabilidad de la lluvia de ${r.nombre}`}
                        />
                      ) : (
                        <Insufficient />
                      )}
                    </Cell>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-2 font-mono text-[13px] text-muted">
            Las barras de cada columna usan la misma escala en las tres estrategias. La marca gruesa es la mediana.
          </p>

          {sameSpanText && (
            <p className="mt-4 max-w-prose border-l-4 border-cielo pl-4 text-ink">{sameSpanText}</p>
          )}

          {/* Frases descriptivas a partir de los números */}
          <ul className="mt-6 space-y-2">
            {sentences.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span aria-hidden className="font-mono font-medium text-cielo">
                  ·
                </span>
                <span className="text-ink">{s}</span>
              </li>
            ))}
          </ul>

          <CampaignTable cards={cards} crops={crops} rows={rows} />

          <div className="mt-6 border-t border-line pt-4 text-muted">
            <p className="max-w-prose">
              {USE_MOCKS
                ? `Datos de ejemplo${span}: modo ejemplo, no son de NASA POWER. `
                : `Datos reales de NASA POWER${span} para la zona de la parcela. `}
              No es un pronóstico ni indica cuánta agua de riego hay disponible. No se comparan con requisitos de cultivo
              porque varios aún no tienen fuente verificada.
            </p>
            <p className="mt-2 max-w-prose">
              Cómo se calcula: para cada campaña se toma su ventana (mismo día y mes de inicio y fin) en cada año del
              histórico; un año cuenta solo si la ventana tiene al menos 80 % de días con dato, y los días sin dato no se
              rellenan. La lluvia de una estrategia es la suma de sus dos campañas y su temperatura, el promedio de los
              días con dato de ambas. Con menos de 3 años válidos no se muestra el rango.
            </p>
          </div>
        </>
      )}
    </section>
  )
}
