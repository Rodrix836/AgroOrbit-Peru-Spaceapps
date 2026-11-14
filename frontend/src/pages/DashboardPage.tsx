import { NasaCards } from '../components/nasa/NasaCards'
import { NasaChart } from '../components/nasa/NasaChart'
import { PlotSummary } from '../components/plot/PlotSummary'
import { ReadingsChart } from '../components/sensors/ReadingsChart'
import { SensorCards } from '../components/sensors/SensorCards'
import { Alert } from '../components/ui/Alert'
import { Button, ButtonLink } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBox } from '../components/ui/ErrorBox'
import { Loading } from '../components/ui/Loading'
import { SectionCard } from '../components/ui/SectionCard'
import { useNasa } from '../hooks/useNasa'
import { usePlot } from '../hooks/usePlot'
import { useReadings } from '../hooks/useReadings'

export function DashboardPage() {
  const { plot, loading: plotLoading, error: plotError, reload } = usePlot()
  const readings = useReadings(plot?.id ?? null)
  const nasa = useNasa(plot?.id ?? null)

  if (plotLoading) return <Loading label="Cargando tu parcela…" />
  if (plotError) return <ErrorBox message={plotError} onRetry={reload} />
  if (!plot) {
    return (
      <EmptyState
        title="Primero registra tu parcela"
        action={<ButtonLink to="/parcela">Ir a Mi parcela</ButtonLink>}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumen de la parcela + botón destacado a rotaciones */}
      <PlotSummary />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* MEDICIÓN PUNTUAL: sensor ESP32. Nunca se mezcla con el contexto NASA. */}
        <SectionCard
          title="Tu suelo (sensor)"
          description="Lo que mide el sensor ESP32 enterrado en tu parcela, en un punto."
          source="sensor"
          tone="sensor"
        >
          {readings.loading && <Loading label="Leyendo el sensor…" />}
          {readings.error && <ErrorBox message={readings.error} onRetry={readings.reload} />}
          {readings.data && (
            <>
              <SensorCards readings={readings.data} />
              <ReadingsChart readings={readings.data} />
            </>
          )}
        </SectionCard>

        {/* CONTEXTO REGIONAL: NASA POWER. No es una medición sobre la planta. */}
        <SectionCard
          title="Clima de la zona (NASA POWER)"
          description="Datos de modelo para tu zona. No son una medición sobre tus plantas."
          source="nasa"
          tone="nasa"
          actions={
            <Button variant="nasa" onClick={() => void nasa.refresh()} disabled={nasa.refreshing}>
              {nasa.refreshing ? 'Consultando NASA…' : 'Actualizar clima'}
            </Button>
          }
        >
          {nasa.refreshError && (
            <Alert tone="warn" title="NASA no está disponible ahora" role="alert">
              {nasa.refreshError} Se muestran los últimos datos guardados, con su fecha.
            </Alert>
          )}
          {nasa.loading && <Loading label="Cargando clima NASA…" />}
          {nasa.error && <ErrorBox message={nasa.error} onRetry={nasa.reload} />}
          {nasa.data && (
            <>
              <NasaCards observations={nasa.data} />
              <NasaChart observations={nasa.data} />
            </>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
