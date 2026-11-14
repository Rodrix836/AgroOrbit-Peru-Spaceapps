import type { WaterAvailability } from '../../types/api'

/** Textos de la disponibilidad de agua (water_availability de la API). */
export const WATER_LABELS: Record<WaterAvailability, string> = {
  low: 'Poca agua',
  medium: 'Agua moderada',
  high: 'Mucha agua',
}

export const WATER_OPTIONS: { value: WaterAvailability; label: string }[] = [
  { value: 'low', label: 'Poca agua (riego escaso)' },
  { value: 'medium', label: 'Agua moderada' },
  { value: 'high', label: 'Mucha agua (riego asegurado)' },
]
