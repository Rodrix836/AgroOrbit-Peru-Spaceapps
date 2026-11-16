import type { Crop } from '../../types/api'
import { tr } from '../../i18n/active'
import { formatDay } from '../../utils/format'
import { WATER_LABELS } from '../plot/water'
import type { WaterAvailability } from '../../types/api'

/** Nombres de respaldo por si el catálogo (GET /api/crops) aún no cargó. */
const FALLBACK_CROP_KEYS = {
  maiz: 'crop.maiz',
  frijol_caupi: 'crop.frijol_caupi',
  camote: 'crop.camote',
} as const

/**
 * Nombre del cultivo a partir de su id, en el idioma activo. Los tres cultivos del piloto se traducen por id (el
 * catálogo de la API trae el nombre en español); un cultivo desconocido usa el nombre del catálogo o el id.
 */
export function cropName(id: string, crops: Crop[]): string {
  if (id in FALLBACK_CROP_KEYS) return tr(FALLBACK_CROP_KEYS[id as keyof typeof FALLBACK_CROP_KEYS])
  return crops.find((c) => c.id === id)?.name ?? id
}

const FIELD_KEYS = {
  'plot.previous_crop': 'field.plot.previous_crop',
  'plot.current_crop': 'field.plot.current_crop',
  'plot.water_availability': 'field.plot.water_availability',
  'plot.soil_texture': 'field.plot.soil_texture',
  'plot.soil_ph': 'field.plot.soil_ph',
  'plot.soil_salinity_ds_m': 'field.plot.soil_salinity_ds_m',
  'plot.area_ha': 'field.plot.area_ha',
  'plot.current_crop_end': 'field.plot.current_crop_end',
  'campaigns.dates': 'field.campaigns.dates',
  'crops.requirements': 'field.crops.requirements',
  'plot.start_on': 'field.plot.start_on',
  'plot.next_sowing_date': 'field.plot.next_sowing_date',
  'climate.history': 'field.climate.history',
  'engine.criteria': 'field.engine.criteria',
  engine: 'field.engine',
  'request.horizon_days': 'field.request.horizon_days',
} as const

const PRIORITY_KEYS = {
  save_water: 'priority.save_water',
  improve_soil: 'priority.improve_soil',
} as const

/** Etiqueta legible de un `field` del contrato. Un campo desconocido se muestra tal cual. */
export function fieldLabel(field: string, crops: Crop[]): string {
  if (field in FIELD_KEYS) return tr(FIELD_KEYS[field as keyof typeof FIELD_KEYS])
  const m = /^crops\.([^.]+)\.requirements$/.exec(field)
  if (m) return cropName(m[1], crops)
  const w = /^engine\.priority_weights\.([^.]+)$/.exec(field)
  if (w) {
    const p = w[1] in PRIORITY_KEYS ? tr(PRIORITY_KEYS[w[1] as keyof typeof PRIORITY_KEYS]) : w[1]
    return tr('field.weights', { priority: p })
  }
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
