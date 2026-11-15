import { formatAgo, isStale } from '../../utils/format'

/**
 * Bajo cada lectura: hace cuánto llegó («Última lectura: hace 12 s»).
 * Con el sensor al día, además un punto verde y «Recibiendo datos»; si pasó el umbral, el tiempo va en ámbar.
 */
export function Freshness({ recordedAt, now }: { recordedAt: string; now: number }) {
  const fresh = !isStale(recordedAt, now)
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-base">
      {fresh && (
        <span className="inline-flex items-center gap-2 font-medium text-lima">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-lima" />
          Recibiendo datos
        </span>
      )}
      <span className={fresh ? 'text-ink' : 'font-medium text-ambar'}>
        Última lectura: {formatAgo(recordedAt, now)}
      </span>
    </div>
  )
}
