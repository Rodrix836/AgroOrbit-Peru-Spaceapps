import { TONES, type Tone } from './styles'

const LABELS: Record<Tone, string> = {
  sensor: 'Sensor',
  nasa: 'NASA POWER',
  prototype: 'Prototipo',
}

/** Insignia de fuente: de dónde sale cada dato (Sensor / NASA POWER / Prototipo). */
export function SourceBadge({ kind, label }: { kind: Tone; label?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-0.5 font-semibold ${TONES[kind].badge}`}
    >
      {label ?? LABELS[kind]}
    </span>
  )
}
