import { tr } from '../../i18n/active'
import type { WaterAvailability } from '../../types/api'

/** Textos de la disponibilidad de agua (water_availability de la API), en el idioma activo. */
export const WATER_LABELS: Record<WaterAvailability, string> = {
  get low() {
    return tr('water.low')
  },
  get medium() {
    return tr('water.medium')
  },
  get high() {
    return tr('water.high')
  },
}

/** Opciones del selector de agua, en el idioma activo. */
export function waterOptions(): { value: WaterAvailability; label: string }[] {
  return [
    { value: 'low', label: tr('water.lowOption') },
    { value: 'medium', label: tr('water.mediumOption') },
    { value: 'high', label: tr('water.highOption') },
  ]
}
