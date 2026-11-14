import { usePlot } from '../../hooks/usePlot'
import type { Irrigation } from '../../types/api'
import { Eyebrow } from '../ui/Eyebrow'

const IRRIGATION: Record<Irrigation, string> = {
  available: 'Riego disponible',
  limited: 'Riego limitado',
  none: 'Sin riego (solo lluvia)',
}

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
      <p className="text-ink">{IRRIGATION[prefs.irrigation]}</p>
    </div>
  )
}
