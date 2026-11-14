import type { ReactNode } from 'react'
import { formatNumber } from '../../utils/format'
import { Eyebrow } from './Eyebrow'
import { SourceBadge } from './SourceBadge'
import { TONES, type Tone } from './styles'

interface Props {
  label: string
  /** null = no hay dato: se muestra "Sin dato", nunca un valor inventado. */
  value: number | null
  unit: string
  /** Fecha/hora (o período) ya formateada. */
  when: string | null
  source: Tone
  sourceDetail?: string
  digits?: number
  note?: string
  /** Etiquetas extra junto al título (p. ej. DATO DE PRUEBA). */
  badge?: ReactNode
}

/** Cifra mono con la unidad pequeña al lado, más fecha/hora y fuente. */
export function StatCard({ label, value, unit, when, source, sourceDetail, digits = 1, note, badge }: Props) {
  const tone = TONES[source]
  return (
    <div className="border-t border-line pt-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Eyebrow>{label}</Eyebrow>
        {badge}
      </div>
      {value === null ? (
        <p className="mt-2 font-mono text-3xl font-medium text-muted">Sin dato</p>
      ) : (
        <p className={`mt-2 flex items-baseline gap-2 font-mono ${tone.text}`}>
          <span className="text-5xl font-medium tracking-tight">{formatNumber(value, digits)}</span>
          <span className="text-xl text-muted">{unit}</span>
        </p>
      )}
      <p className="mt-2 font-mono text-base text-ink">{when ?? 'Sin fecha'}</p>
      {note && <p className="mt-1 text-muted">{note}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SourceBadge kind={source} />
        {sourceDetail && <span className="text-muted">{sourceDetail}</span>}
      </div>
    </div>
  )
}
