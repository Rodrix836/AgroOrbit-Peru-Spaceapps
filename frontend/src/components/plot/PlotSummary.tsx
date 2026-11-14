import { usePlot } from '../../hooks/usePlot'
import { Eyebrow } from '../ui/Eyebrow'
import { WATER_LABELS } from './water'

/** Bloque mono con nombre, coordenadas, cultivo y riego de la parcela. */
export function PlotSummary() {
  const { plot, crops, prefs } = usePlot()
  if (!plot) return null
  const crop = prefs.currentCropId
    ? (crops.find((c) => c.id === prefs.currentCropId)?.name ?? 'Sin registrar')
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
        Agua: {prefs.waterAvailability ? WATER_LABELS[prefs.waterAvailability] : 'Sin indicar'}
      </p>
    </div>
  )
}
