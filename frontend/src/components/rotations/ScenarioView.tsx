import { ESCENARIO_VALLE_CHIRA } from '../../data/escenario-valle-chira'
import { useAsync } from '../../hooks/useAsync'
import { usePlot } from '../../hooks/usePlot'
import { api } from '../../services/api'
import type { RecommendationContext } from '../../types/api'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { ErrorBox } from '../ui/ErrorBox'
import { Eyebrow } from '../ui/Eyebrow'
import { Loading } from '../ui/Loading'
import { PageHeader } from '../ui/PageHeader'
import { PanelGrid } from '../ui/PanelGrid'
import { labelClass } from '../ui/styles'
import { ContextPanel } from './ContextPanel'
import { ScenarioCard } from './ScenarioCard'
import { SourcesList } from './SourcesList'

/**
 * Vista del escenario de demostración (se abre con «Ver escenario de demostración» y se cierra con «Volver a la
 * evaluación real»). Tres secuencias de dos campañas, cualitativas, con sus supuestos y fuentes.
 * El bloque «Con qué datos» usa el contexto REAL de la respuesta de la parcela (histórico de NASA POWER), no los
 * indicadores de ningún JSON de ejemplo.
 */
export function ScenarioView({
  plotId,
  context,
  createdAt,
  contextLoading,
  contextError,
  example,
  onBack,
}: {
  plotId: string
  /** `context` de la evaluación real de la parcela. */
  context: RecommendationContext | null
  createdAt?: string
  contextLoading: boolean
  contextError: string | null
  /** true = la respuesta real sale de mocks (modo ejemplo). */
  example: boolean
  onBack: () => void
}) {
  const { crops } = usePlot()
  const q = useAsync(() => api.getDemoScenario(plotId), [plotId])
  const scenario = q.data?.scenario ?? null

  const back = (
    <Button variant="outline" onClick={onBack}>
      ← Volver a la evaluación real
    </Button>
  )

  return (
    <div>
      {/* Aviso ámbar arriba de todo */}
      <div className="mb-8">
        <Alert tone="warn">
          <p className="text-lg font-semibold">{scenario?.notice ?? ESCENARIO_VALLE_CHIRA.notice}</p>
        </Alert>
      </div>

      <PageHeader index="03" label="Rotaciones" title="Escenario de demostración" />
      <div className="-mt-4 mb-8">{back}</div>

      {q.loading && <Loading label="Cargando el escenario…" />}
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
              {scenario.tags.map((t) => (
                <li key={t} className={`border border-ambar px-2 py-1 font-medium text-ambar ${labelClass}`}>
                  {t}
                </li>
              ))}
            </ul>
            <Eyebrow tone="ambar" className="mb-3">
              Supuestos de este escenario
            </Eyebrow>
            <ul className="space-y-2">
              {scenario.assumptions.map((a, i) => (
                <li key={i} className="flex gap-3">
                  <span aria-hidden className="font-mono text-ambar">
                    –
                  </span>
                  <span className="text-ink">{a}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Tres tarjetas: referencia, alternativa A y alternativa B (apiladas en celular) */}
          <PanelGrid className="lg:grid-cols-3">
            {scenario.alternatives.map((alt, i) => (
              <ScenarioCard key={alt.id} alt={alt} fallbackLabel={`Alternativa ${String.fromCharCode(65 + i)}`} crops={crops} />
            ))}
          </PanelGrid>

          {/* Lectura comparativa sin puntuaciones */}
          <section className="mt-6 bg-panel p-6 md:p-8">
            <Eyebrow tone="cielo" className="mb-4">
              Lectura comparativa sin puntuaciones
            </Eyebrow>
            <div className="space-y-6">
              {scenario.comparativeReading.map((r) => (
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
        </>
      )}

      {/* Con qué datos: contexto real de NASA POWER de la parcela; el ESP32 sigue como dato de prueba */}
      <div className="mt-6">
        {contextLoading && <Loading label="Cargando el histórico de NASA POWER de tu parcela…" />}
        {contextError && <ErrorBox message={contextError} />}
        {!contextLoading && context && (
          <ContextPanel
            context={context}
            createdAt={createdAt}
            example={example}
            title="Con qué datos"
            powerTitle="Histórico real de NASA POWER para esta parcela"
          />
        )}
        {!contextLoading && !contextError && !context && (
          <p className="text-muted">Todavía no hay histórico de NASA POWER para mostrar de esta parcela.</p>
        )}
      </div>

      {scenario && scenario.farmerTexts.length > 0 && (
        <section className="mb-8 border border-line bg-panel p-6 md:p-8" aria-label="Para tener en cuenta">
          <Eyebrow tone="lima" className="mb-4">
            Para tener en cuenta
          </Eyebrow>
          <ul className="space-y-3">
            {scenario.farmerTexts.map((t, i) => (
              <li key={i} className="flex gap-3">
                <span aria-hidden className="font-mono text-lima">
                  ·
                </span>
                <span className="text-ink">{t}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-8">{back}</div>
    </div>
  )
}
