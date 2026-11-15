import type { SensorReading } from '../../types/api'
import { labelClass } from '../ui/styles'

/** Etiqueta ámbar "DATO DE PRUEBA": la lectura viene de un kit de prueba (quality_flag = test). */
export function TestBadge() {
  return (
    <span className={`inline-flex items-center border border-ambar bg-ambar-bg px-2 py-0.5 text-ambar ${labelClass}`}>
      Dato de prueba
    </span>
  )
}

/** Aviso breve según la calidad de la lectura. No oculta el dato. */
export function qualityWarning(reading: SensorReading | null): string | null {
  switch (reading?.quality_flag) {
    case 'clamped_dry':
    case 'clamped_wet':
      return 'Lectura en el límite de calibración.'
    case 'suspect':
      return 'Lectura dudosa.'
    default:
      return null
  }
}

/** Etiqueta de prueba y/o aviso de calidad de una lectura, para ponerlos junto a la cifra. */
export function QualityNotice({ reading }: { reading: SensorReading | null }) {
  const warning = qualityWarning(reading)
  if (reading?.quality_flag !== 'test' && !warning) return null
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {reading?.quality_flag === 'test' && <TestBadge />}
      {warning && <span className="font-medium text-ambar">{warning}</span>}
    </span>
  )
}
