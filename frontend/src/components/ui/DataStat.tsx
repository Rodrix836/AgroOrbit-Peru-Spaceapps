import { formatNumber } from '../../utils/format'
import { SourceTag, type SourceKind } from './SourceTag'

interface Props {
  label: string
  /** null = no hay dato: se muestra "Sin dato", nunca un valor inventado. */
  value: number | null
  unit: string
  /** Texto ya formateado de fecha/hora (o período). */
  when: string | null
  source: string
  kind: SourceKind
  digits?: number
  note?: string
}

/** Cifra con unidad, fecha/hora y fuente: el formato obligatorio de todo dato. */
export function DataStat({ label, value, unit, when, source, kind, digits = 1, note }: Props) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-stone-600">{label}</p>
      {value === null ? (
        <p className="mt-1 text-2xl font-bold text-stone-500">Sin dato</p>
      ) : (
        <p className="mt-1 text-4xl font-bold text-stone-900">
          {formatNumber(value, digits)}
          <span className="ml-1 text-xl font-semibold text-stone-600">{unit}</span>
        </p>
      )}
      <p className="mt-2 text-sm text-stone-700">{when ?? 'Sin fecha'}</p>
      {note && <p className="mt-1 text-sm text-stone-600">{note}</p>}
      <div className="mt-2">
        <SourceTag kind={kind} label={source} />
      </div>
    </div>
  )
}
