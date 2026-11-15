import { useEffect, useMemo, useRef, useState } from 'react'
import { LECTURA_COMPARATIVA, TEXTOS_AGRICULTOR } from '../../data/lectura-milene'
import { useAsync } from '../../hooks/useAsync'
import { useClimateHistory } from '../../hooks/useClimateHistory'
import { usePlot } from '../../hooks/usePlot'
import { api } from '../../services/api'
import type { Priority } from '../../types/api'
import type { ScenarioModel } from '../../types/scenario'
import { computeTradeoffs } from '../../utils/tradeoffs'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { ErrorBox } from '../ui/ErrorBox'
import { Eyebrow } from '../ui/Eyebrow'
import { Loading } from '../ui/Loading'
import { PageHeader } from '../ui/PageHeader'
import { PanelGrid } from '../ui/PanelGrid'
import { labelClass } from '../ui/styles'
import { ContextPanel } from './ContextPanel'
import { weightChanges, weightPct } from './criteria'
import { assumptionValue, fieldLabel } from './labels'
import { ScenarioCard } from './ScenarioCard'
import { SourcesList } from './SourcesList'
import { TradeoffsSection } from './TradeoffsSection'

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'save_water', label: 'Ahorrar agua' },
  { value: 'improve_soil', label: 'Mejorar el suelo' },
]

/**
 * Vista del escenario de demostración (se abre con «Ver escenario de demostración» y se cierra con «Volver a la
 * evaluación real»). Sale de los dos archivos de Rodrigo (uno por prioridad): tres tarjetas en el orden de
 * `demo.estrategias`, sin ganadora. Lo sintético va siempre identificado; el único dato real es el histórico de
 * NASA POWER del bloque «Con qué datos».
 */
export function ScenarioView({
  plotId,
  priority,
  onPriorityChange,
  onBack,
}: {
  plotId: string
  priority: Priority
  onPriorityChange: (p: Priority) => void
  onBack: () => void
}) {
  const { crops } = usePlot()
  const q = useAsync(() => api.getDemoScenario(plotId, priority), [plotId, priority])
  const scenario = q.data?.scenario ?? null

  // Histórico real de NASA POWER (10 años): el mismo que usa «Riesgo e incertidumbre»; se descarga una sola vez.
  const history = useClimateHistory(plotId)
  const tradeoffs = useMemo(
    () => (scenario && history.data ? computeTradeoffs(scenario.cards, history.data) : null),
    [scenario, history.data],
  )

  // El escenario que se veía con la otra prioridad: sirve para mostrar qué pesos de prueba cambiaron.
  type Shown = { priority: Priority; scenario: ScenarioModel }
  const lastShown = useRef<Shown | null>(null)
  const [previous, setPrevious] = useState<Shown | null>(null)
  useEffect(() => {
    const s = q.data?.scenario
    if (!s || !s.priority) return
    const last = lastShown.current
    if (last && last.priority !== s.priority) setPrevious(last)
    lastShown.current = { priority: s.priority, scenario: s }
  }, [q.data])

  const prevScenario = previous && scenario && previous.priority !== scenario.priority ? previous.scenario : null
  const previousCriteriaOf = (id: string) => prevScenario?.cards.find((c) => c.id === id)?.alt.criteria
  let changed: ReturnType<typeof weightChanges> = []
  if (scenario && prevScenario) {
    for (const c of scenario.cards) {
      changed = weightChanges(previousCriteriaOf(c.id), c.alt.criteria)
      if (changed.length > 0) break
    }
  }
  const priorityLabel = PRIORITIES.find((p) => p.value === (scenario?.priority ?? priority))?.label ?? ''

  const back = (
    <Button variant="outline" onClick={onBack}>
      ← Volver a la evaluación real
    </Button>
  )

  return (
    <div>
      {/* Aviso ámbar arriba de todo: demo.aviso */}
      <div className="mb-8">
        <Alert tone="warn">
          <p className="text-lg font-semibold">
            {scenario?.aviso ?? 'Escenario de demostración. No es una recomendación validada para la parcela.'}
          </p>
        </Alert>
      </div>

      <PageHeader index="03" label="Rotaciones" title="Escenario de demostración" />
      <div className="-mt-4 mb-6">{back}</div>

      {/* Prioridad: cambia los pesos de prueba, no el orden de las tarjetas */}
      <div className="mb-8 flex flex-wrap items-center gap-3 border-y border-line py-4" role="group" aria-label="Prioridad">
        <Eyebrow className="mr-2">Prioridad</Eyebrow>
        {PRIORITIES.map((p) => (
          <Button
            key={p.value}
            variant={priority === p.value ? 'primary' : 'outline'}
            aria-pressed={priority === p.value}
            onClick={() => onPriorityChange(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {q.loading && !scenario && <Loading label="Cargando el escenario…" />}
      {q.error && <ErrorBox message={q.error} onRetry={q.reload} />}
      {q.data?.fallback && (
        <p className="mb-6 text-muted">
          No se pudo leer el escenario desde la API ({q.data.fallback}); se muestra el que está guardado en la app.
        </p>
      )}

      {scenario && (
        <>
          {/* Etiquetas y supuestos, junto a la comparación */}
          <section className="mb-6 border border-ambar bg-ambar-bg p-5 md:p-6" aria-label="Supuestos del escenario">
            <ul className="mb-4 flex flex-wrap gap-2" aria-label="Etiquetas">
              {['Textura franca supuesta', 'Fechas ilustrativas'].map((t) => (
                <li key={t} className={`border border-ambar px-2 py-1 font-medium text-ambar ${labelClass}`}>
                  {t}
                </li>
              ))}
            </ul>
            <Eyebrow tone="ambar" className="mb-3">
              Supuestos de este escenario
            </Eyebrow>
            <ul className="space-y-2">
              {[scenario.supuestos.textura, scenario.supuestos.fechas]
                .filter((t): t is string => !!t)
                .map((t, i) => (
                  <li key={`s${i}`} className="flex gap-3">
                    <span aria-hidden className="font-mono text-ambar">
                      –
                    </span>
                    <span className="text-ink">{t}</span>
                  </li>
                ))}
            </ul>
            {scenario.assumptions.length > 0 && (
              <>
                <p className="mb-2 mt-5 font-medium text-ink">Lista de supuestos de la respuesta</p>
                <ul className="space-y-2">
                  {scenario.assumptions.map((a, i) => (
                    <li key={`${a.field}-${i}`} className="flex gap-3">
                      <span aria-hidden className="font-mono text-ambar">
                        –
                      </span>
                      <span className="text-ink">
                        <span className="font-medium">{fieldLabel(a.field, crops)}:</span>{' '}
                        {assumptionValue(a.field, a.value, crops)}. <span className="text-muted">{a.reason}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* Al cambiar la prioridad: qué pesos de prueba cambiaron */}
          {changed.length > 0 && (
            <div className="mb-6 border-l-4 border-ambar bg-panel p-4">
              <p className="text-ink">
                <span className="font-medium">Pesos de prueba (sintéticos).</span> Con «{priorityLabel}» cambió cuánto
                pesa cada criterio en el puntaje de prueba:{' '}
                {changed.map((c, i) => (
                  <span key={c.id}>
                    {i > 0 && '; '}
                    <span className="font-medium">{c.label}</span>{' '}
                    <span className="font-mono text-base">
                      {weightPct(c.from)} → {weightPct(c.to)}
                    </span>
                  </span>
                ))}
                . El orden de las tarjetas no cambia.
              </p>
            </div>
          )}

          {/* Tres tarjetas en el orden de demo.estrategias (apiladas en celular) */}
          <PanelGrid className="lg:grid-cols-3">
            {scenario.cards.map((card) => (
              <ScenarioCard
                key={card.id}
                card={card}
                crops={crops}
                syntheticNote={scenario.sintetico.puntuaciones}
                previousCriteria={previousCriteriaOf(card.id)}
                windowStats={tradeoffs?.rows.find((r) => r.id === card.id)?.stats.campaigns}
              />
            ))}
          </PanelGrid>

          {/* Compensaciones entre estrategias: cálculo sobre el histórico real de NASA POWER */}
          <TradeoffsSection
            cards={scenario.cards}
            crops={crops}
            tradeoffs={tradeoffs}
            loading={history.loading && !history.data}
            error={history.error}
            onRetry={history.reload}
          />

          {/* Lectura comparativa sin puntuaciones (Milene) */}
          <section className="mt-6 bg-panel p-6 md:p-8">
            <Eyebrow tone="cielo" className="mb-4">
              Lectura comparativa sin puntuaciones
            </Eyebrow>
            <div className="space-y-6">
              {LECTURA_COMPARATIVA.map((r) => (
                <div key={r.title}>
                  <h3 className="font-semibold text-ink">{r.title}</h3>
                  <p className="mt-1 max-w-prose text-ink">{r.text}</p>
                  <div className="mt-2">
                    <SourcesList sources={r.sources} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Con qué datos: NASA POWER real, separado de lo sintético */}
          <div className="mt-6">
            {scenario.context ? (
              <ContextPanel
                context={scenario.context}
                createdAt={scenario.createdAt}
                title="Con qué datos"
                powerTitle="Histórico real de NASA POWER para esta parcela"
                powerNote={scenario.sintetico.clima}
              />
            ) : (
              <p className="mb-8 text-muted">El escenario no trae el contexto de NASA POWER para mostrar.</p>
            )}
          </div>

          {/* Lo sintético, aparte del bloque anterior */}
          {(scenario.sintetico.puntuaciones || scenario.sintetico.requisitos_cultivo) && (
            <section
              className="mb-8 border border-dashed border-ambar bg-ambar-bg p-6 md:p-8"
              aria-label="Datos de prueba del escenario"
            >
              <Eyebrow tone="ambar" className="mb-4">
                Datos de prueba
              </Eyebrow>
              <ul className="space-y-3">
                {[scenario.sintetico.puntuaciones, scenario.sintetico.requisitos_cultivo]
                  .filter((t): t is string => !!t)
                  .map((t, i) => (
                    <li key={i} className="flex gap-3">
                      <span aria-hidden className="font-mono text-ambar">
                        –
                      </span>
                      <span className="text-ink">{t}</span>
                    </li>
                  ))}
              </ul>
            </section>
          )}

          <section className="mb-8 border border-line bg-panel p-6 md:p-8" aria-label="Para tener en cuenta">
            <Eyebrow tone="lima" className="mb-4">
              Para tener en cuenta
            </Eyebrow>
            <ul className="space-y-3">
              {TEXTOS_AGRICULTOR.map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span aria-hidden className="font-mono text-lima">
                    ·
                  </span>
                  <span className="text-ink">{t}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <div className="mb-8">{back}</div>
    </div>
  )
}
