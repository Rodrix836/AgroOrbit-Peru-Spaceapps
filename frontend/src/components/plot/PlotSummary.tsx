import { usePlot } from '../../hooks/usePlot'
import type { Irrigation, Priority } from '../../types/api'
import { formatDay } from '../../utils/format'
import { ButtonLink } from '../ui/Button'

const IRRIGATION: Record<Irrigation, string> = {
  available: 'Riego disponible',
  limited: 'Riego limitado',
  none: 'Sin riego (solo lluvia)',
}
const PRIORITY: Record<Priority, string> = {
  save_water: 'Ahorrar agua',
  improve_soil: 'Mejorar el suelo',
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium text-muted">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  )
}

/** Resumen de la parcela con el botón destacado hacia las rotaciones. */
export function PlotSummary() {
  const { plot, crops, prefs } = usePlot()
  if (!plot) return null
  const cropName = (id: string) => crops.find((c) => c.id === id)?.name ?? 'Sin registrar'

  return (
    <section className="rounded-2xl border border-line border-t-8 border-t-brand-700 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-brand-900">{plot.name}</h2>
          <p className="text-muted">
            Ubicación: {plot.latitude}°, {plot.longitude}°
          </p>
        </div>
        <ButtonLink to="/rotaciones" size="lg" className="w-full sm:w-auto">
          Ver rotaciones →
        </ButtonLink>
      </div>
      <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        <Item label="Cultivo actual" value={prefs.currentCropId ? cropName(prefs.currentCropId) : 'Sin registrar'} />
        <Item
          label="Cultivo anterior"
          value={prefs.previousCropId ? cropName(prefs.previousCropId) : 'Sin registrar'}
        />
        <Item label="Riego" value={IRRIGATION[prefs.irrigation]} />
        <Item
          label="Inicio de la próxima campaña"
          value={prefs.startOn ? formatDay(prefs.startOn) : 'Sin registrar'}
        />
        <Item label="Prioridad" value={PRIORITY[prefs.priority]} />
      </dl>
    </section>
  )
}
