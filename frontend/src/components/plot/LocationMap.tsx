import { lazy, Suspense } from 'react'
import { useLanguage } from '../../i18n/LanguageContext'
import { Loading } from '../ui/Loading'
import type { MapOverlay } from './PlotMap'

// Leaflet pesa bastante: se carga aparte, solo cuando se muestra el mapa.
const PlotMap = lazy(() => import('./PlotMap'))

/** Mapa de ubicación de la parcela (reemplaza a la antigua cuadrícula de referencia). */
export function LocationMap(props: {
  lat: string | number | null
  lng: string | number | null
  /** Con esta función, un clic en el mapa coloca el punto. */
  onPick?: (lat: number, lng: number) => void
  /** Otra capa de NASA GIBS en lugar de la de color real. */
  overlay?: MapOverlay
  /** La imagen satelital empieza encendida. */
  overlayOn?: boolean
  /** Sin leyenda ni línea de la imagen, y con menos alto. */
  compact?: boolean
}) {
  const { t } = useLanguage()
  return (
    <Suspense fallback={<Loading label={t('map.loading')} />}>
      <PlotMap {...props} />
    </Suspense>
  )
}
