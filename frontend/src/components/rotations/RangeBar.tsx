import { formatFixed, formatNumber } from '../../utils/format'

/**
 * Barra de rango mínimo–máximo con la mediana marcada. Todas las barras de una misma columna usan la misma escala
 * (`scaleMin`–`scaleMax`), así se comparan de un vistazo. Un solo tono (azul NASA): no hay colores de bueno o malo.
 */
export function RangeBar({
  min,
  median,
  max,
  scaleMin,
  scaleMax,
  unit,
  decimals = 0,
  label,
  minLabel,
  maxLabel,
}: {
  min: number
  median: number
  max: number
  scaleMin: number
  scaleMax: number
  unit: string
  decimals?: number
  /** Para lectores de pantalla: qué mide la barra. */
  label: string
  /** Año (o temporada) del mínimo y del máximo; si llegan, se escriben bajo la barra («máx. 652 mm en 2016–17»). */
  minLabel?: string | null
  maxLabel?: string | null
}) {
  const span = scaleMax - scaleMin || 1
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - scaleMin) / span) * 100))
  const left = pct(min)
  // Un rango muy angosto se sigue viendo (mínimo 1,5 % del ancho).
  const width = Math.max(1.5, pct(max) - left)
  const f = (v: number) => (decimals > 0 ? formatFixed(v, decimals) : formatNumber(v, 0))
  return (
    <div>
      <p className="font-mono text-base text-ink">
        {f(min)}–{f(max)} <span className="text-muted">{unit}</span>
      </p>
      <div
        role="img"
        aria-label={`${label}: de ${f(min)} a ${f(max)} ${unit}, mediana ${f(median)} ${unit}`}
        className="relative mt-1 h-4 border border-line bg-track"
      >
        <div className="absolute inset-y-0 border-x-2 border-cielo bg-cielo/30" style={{ left: `${left}%`, width: `${width}%` }} />
        <div className="absolute -inset-y-1 w-[3px] -translate-x-1/2 bg-cielo" style={{ left: `${pct(median)}%` }} />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[13px] text-muted">
        <span>{f(scaleMin)}</span>
        <span>
          {f(scaleMax)} {unit}
        </span>
      </div>
      <p className="font-mono text-base text-cielo">
        mediana {f(median)} <span className="text-muted">{unit}</span>
      </p>
      {maxLabel && (
        <p className="font-mono text-[13px] text-ink">
          máx. {f(max)} {unit} en {maxLabel}
        </p>
      )}
      {minLabel && (
        <p className="font-mono text-[13px] text-ink">
          mín. {f(min)} {unit} en {minLabel}
        </p>
      )}
    </div>
  )
}

/** Barra simple de una magnitud (0 a `scaleMax`), con la misma escala en todas las filas. */
export function ValueBar({ value, scaleMax, unit, label }: { value: number; scaleMax: number; unit: string; label: string }) {
  const w = scaleMax > 0 ? Math.min(100, Math.max(0, (value / scaleMax) * 100)) : 0
  return (
    <div>
      <p className="font-mono text-lg text-cielo">
        {formatNumber(value, 0)} <span className="text-base text-muted">{unit}</span>
      </p>
      <div
        role="img"
        aria-label={`${label}: ${formatNumber(value, 0)} ${unit}`}
        className="relative mt-1 h-4 border border-line bg-track"
      >
        <div className="absolute inset-y-0 left-0 border-r-2 border-cielo bg-cielo/30" style={{ width: `${Math.max(1.5, w)}%` }} />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[13px] text-muted">
        <span>0</span>
        <span>
          {formatNumber(scaleMax, 0)} {unit}
        </span>
      </div>
    </div>
  )
}
