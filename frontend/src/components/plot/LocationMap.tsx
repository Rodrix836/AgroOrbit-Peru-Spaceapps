import { lazy, Suspense } from 'react'
import { Loading } from '../ui/Loading'

// Leaflet pesa bastante: se carga aparte, solo cuando se muestra el mapa.
const PlotMap = lazy(() => import('./PlotMap'))

/** Mapa de ubicación de la parcela (reemplaza a la antigua cuadrícula de referencia). */
export function LocationMap(props: {
  lat: string | number | null
  lng: string | number | null
  /** Con esta función, un clic en el mapa coloca el punto. */
  onPick?: (lat: number, lng: number) => void
}) {
  return (
    <Suspense fallback={<Loading label="Cargando el mapa…" />}>
      <PlotMap {...props} />
    </Suspense>
  )
}
