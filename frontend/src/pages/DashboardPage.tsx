import { Link } from 'react-router-dom'
import { NasaCards } from '../components/nasa/NasaCards'
import { NasaChart } from '../components/nasa/NasaChart'
import { ReadingsChart } from '../components/sensors/ReadingsChart'
import { SensorCards } from '../components/sensors/SensorCards'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBox } from '../components/ui/ErrorBox'
import { Loading } from '../components/ui/Loading'
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
        action={
          <Link to="/parcela" className="font-semibold text-campo-800 underline">
            Ir a Mi parcela
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Datos de «{plot.name}»</h2>

      {/* MEDICIÓN PUNTUAL: sensor ESP32. Nunca se mezcla con el contexto NASA. */}
      <section className="space-y-3 rounded-2xl border-l-8 border-campo-700 bg-campo-50 p-4">
        <div>
          <h3 className="text-xl font-bold text-campo-900">Medición en tu parcela</h3>
          <p className="text-sm text-stone-700">
            Lo que mide el sensor ESP32 enterrado en tu suelo, en un punto.
          </p>
        </div>
        {readings.loading && <Loading label="Leyendo el sensor…" />}
        {readings.error && <ErrorBox message={readings.error} onRetry={readings.reload} />}
        {readings.data && (
          <>
            <SensorCards readings={readings.data} />
            <ReadingsChart readings={readings.data} />
          </>
        )}
      </section>

      {/* CONTEXTO REGIONAL: NASA POWER. No es una medición sobre la planta. */}
      <section className="space-y-3 rounded-2xl border-l-8 border-nasa-700 bg-nasa-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-xl font-bold text-nasa-700">Contexto regional del clima (NASA)</h3>
            <p className="text-sm text-stone-700">
              Datos de modelo de NASA POWER para tu zona. No son una medición sobre tus plantas.
            </p>
          </div>
          <button
            onClick={() => void nasa.refresh()}
            disabled={nasa.refreshing}
            className="rounded-lg bg-nasa-700 px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {nasa.refreshing ? 'Consultando NASA…' : 'Actualizar clima NASA'}
          </button>
        </div>
        {nasa.refreshError && (
          <ErrorBox
            message={`NASA no está disponible ahora: ${nasa.refreshError} Se muestran los últimos datos guardados, con su fecha.`}
          />
        )}
        {nasa.loading && <Loading label="Cargando clima NASA…" />}
        {nasa.error && <ErrorBox message={nasa.error} onRetry={nasa.reload} />}
        {nasa.data && (
          <>
            <NasaCards observations={nasa.data} />
            <NasaChart observations={nasa.data} />
          </>
        )}
      </section>
    </div>
  )
}
