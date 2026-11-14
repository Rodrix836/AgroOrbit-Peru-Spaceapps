import { labelClass, TONES, type Tone } from './styles'

const LABELS: Record<Tone, string> = {
  sensor: 'Sensor ESP32',
  nasa: 'NASA POWER',
  prototype: 'Prototipo',
}

/** Insignia de fuente: de dónde sale cada dato. */
export function SourceBadge({ kind, label }: { kind: Tone; label?: string }) {
  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 ${labelClass} ${TONES[kind].text} ${TONES[kind].border}`}
    >
      {label ?? LABELS[kind]}
    </span>
  )
}
