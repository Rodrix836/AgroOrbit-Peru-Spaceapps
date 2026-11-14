import { formatNumber } from '../../utils/format'
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
  /** Detalle de la fuente, por ejemplo "Sensor ESP32 en tu parcela". */
  sourceDetail?: string
  digits?: number
  note?: string
}

/** Cifra grande con la unidad pequeña al lado, más fecha/hora y fuente. */
export function StatCard({ label, value, unit, when, source, sourceDetail, digits = 1, note }: Props) {
  const tone = TONES[source]
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <p className="font-semibold text-muted">{label}</p>
      {value === null ? (
        <p className="mt-1 text-3xl font-bold text-muted">Sin dato</p>
      ) : (
        <p className={`mt-1 flex items-baseline gap-1.5 ${tone.number}`}>
          <span className="text-5xl font-extrabold tracking-tight">{formatNumber(value, digits)}</span>
          <span className="text-base font-semibold text-muted">{unit}</span>
        </p>
      )}
      <p className="mt-2 font-medium text-ink">{when ?? 'Sin fecha'}</p>
      {note && <p className="mt-1 text-muted">{note}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SourceBadge kind={source} />
        {sourceDetail && <span className="text-muted">{sourceDetail}</span>}
      </div>
    </div>
  )
}
