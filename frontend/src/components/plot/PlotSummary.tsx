import { usePlot } from '../../hooks/usePlot'
import { cropName } from '../rotations/labels'
import { Eyebrow } from '../ui/Eyebrow'
import { WATER_LABELS } from './water'

/** Bloque mono con nombre, coordenadas, cultivo y riego de la parcela. */
export function PlotSummary() {
  const { plot, crops, cycles, cyclesLoading, cyclesError } = usePlot()
  if (!plot) return null
  // Cultivo actual: el ciclo `active` que guarda la API.
  const code = cycles?.current?.crop_code
  const crop = code
    ? cropName(code, crops)
    : cyclesLoading
      ? 'Cargando…'
      : cyclesError
        ? 'No se pudo cargar'
        : 'Sin registrar'

  return (
    <div className="min-w-0 border-l border-edge pl-5 font-mono text-base leading-7">
      <Eyebrow tone="lima">Parcela</Eyebrow>
      <p className="font-medium text-ink">{plot.name}</p>
      <p className="text-muted">
        {plot.latitude}°, {plot.longitude}°
      </p>
      <p className="text-ink">Cultivo: {crop}</p>
      <p className="text-ink">
        Agua: {plot.water_availability ? WATER_LABELS[plot.water_availability] : 'Sin indicar'}
      </p>
    </div>
  )
}
