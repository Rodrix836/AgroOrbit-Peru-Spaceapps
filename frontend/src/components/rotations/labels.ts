import type { Crop } from '../../types/api'
import { formatDay } from '../../utils/format'
import { WATER_LABELS } from '../plot/water'
import type { WaterAvailability } from '../../types/api'

/** Nombres de respaldo por si el catálogo (GET /api/crops) aún no cargó. */
const FALLBACK_CROPS: Record<string, string> = {
  maiz: 'Maíz',
  frijol_caupi: 'Frijol caupí',
  camote: 'Camote',
}

/** Nombre del cultivo a partir de su id. Si no se conoce, se muestra el id tal cual. */
export function cropName(id: string, crops: Crop[]): string {
  return crops.find((c) => c.id === id)?.name ?? FALLBACK_CROPS[id] ?? id
}

const FIELD_LABELS: Record<string, string> = {
  'plot.previous_crop': 'Cultivo anterior',
  'plot.current_crop': 'Cultivo actual',
  'plot.water_availability': 'Disponibilidad de agua',
  'plot.soil_texture': 'Textura del suelo',
  'plot.soil_ph': 'pH del suelo',
  'plot.soil_salinity_ds_m': 'Salinidad del suelo',
  'plot.area_ha': 'Superficie de la parcela',
  'plot.start_on': 'Inicio de la siguiente campaña',
  'plot.next_sowing_date': 'Fecha de inicio de la siguiente campaña',
  'climate.history': 'Histórico de clima',
  'engine.criteria': 'Puntuaciones por criterio con fuente',
  'engine': 'Motor de rotaciones',
  'request.horizon_days': 'Horizonte de tiempo de la consulta',
}

const PRIORITY_LABELS: Record<string, string> = {
  save_water: 'ahorrar agua',
  improve_soil: 'mejorar el suelo',
}

/** Etiqueta legible de un `field` del contrato. Un campo desconocido se muestra tal cual. */
export function fieldLabel(field: string, crops: Crop[]): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field]
  const m = /^crops\.([^.]+)\.requirements$/.exec(field)
  if (m) return cropName(m[1], crops)
  const w = /^engine\.priority_weights\.([^.]+)$/.exec(field)
  if (w) return `Pesos por criterio con fuente (${PRIORITY_LABELS[w[1]] ?? w[1]})`
  return field
}

export type MissingGroup = 'plot' | 'crops' | 'climate' | 'system' | 'other'

export function fieldGroup(field: string): MissingGroup {
  if (field.startsWith('plot.')) return 'plot'
  if (field.startsWith('crops.')) return 'crops'
  if (field.startsWith('climate.')) return 'climate'
  if (field === 'engine' || field.startsWith('engine.') || field.startsWith('request.')) return 'system'
  return 'other'
}

/** Valor de un supuesto en lenguaje claro (ids de cultivo y disponibilidad de agua traducidos). */
export function assumptionValue(field: string, value: string, crops: Crop[]): string {
  if (field === 'plot.previous_crop' || field === 'plot.current_crop') return cropName(value, crops)
  if (field === 'plot.water_availability') return WATER_LABELS[value as WaterAvailability] ?? value
  if (field === 'plot.next_sowing_date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDay(value)
  return value
}
