import type { Alternative } from '../../types/api'
import { formatDay } from '../../utils/format'
import { Eyebrow } from '../ui/Eyebrow'
import { labelClass } from '../ui/styles'
import { CampaignCalendar } from './CampaignCalendar'
import { SourcesList } from './SourcesList'

interface Props {
  alternative: Alternative
  /** true = la de mejor puntaje con la prioridad elegida (se pinta en lima). */
  selected: boolean
  /** Letra de la alternativa: A, B… */
  letter: string
  /** true = la fecha de inicio no está guardada: el calendario usa una fecha supuesta y se avisa. */
  assumedStart?: boolean
}

export function AlternativeCard({ alternative: a, selected, letter, assumedStart = false }: Props) {
  const sequence = a.campaigns.map((c) => c.crop).join(' → ')
  const score = Math.max(0, Math.min(100, a.score))
  const firstStart = a.campaigns.map((c) => c.starts_on).sort()[0]

  return (
    <article className={`min-w-0 bg-panel p-6 md:p-8 ${selected ? 'border-t-2 border-lima' : 'border-t-2 border-transparent'}`}>
      <Eyebrow tone={selected ? 'lima' : 'muted'}>Alternativa {letter}</Eyebrow>
      {/* El espacio de la etiqueta se reserva también en las demás tarjetas, para que todo quede a la misma altura. */}
      <p
        className={`mt-2 inline-block px-2 py-1 font-medium ${labelClass} ${selected ? 'bg-lima text-bg' : 'invisible'}`}
      >
        Mejor puntaje con esta prioridad
      </p>

      <h3
        className={`mt-3 font-display text-[clamp(28px,4vw,40px)] font-extrabold leading-none tracking-[-0.03em] ${
          selected ? 'text-lima' : 'text-ink'
        }`}
      >
        {sequence || 'Sin secuencia'}
      </h3>

      <p className="mt-6 flex flex-wrap items-baseline gap-x-3 font-mono">
        <span className={`text-[72px] font-medium leading-none tracking-[-0.04em] ${selected ? 'text-lima' : 'text-ink'}`}>
          {a.score}
        </span>
        <span className={`${labelClass} text-muted`}>/ 100 · Criterio del prototipo</span>
      </p>
      <div className="mt-3 h-1 w-full bg-track" aria-hidden>
        <div className={`h-full ${selected ? 'bg-lima' : 'bg-muted'}`} style={{ width: `${score}%` }} />
      </div>
      <p className="mt-2 text-muted">
        Es un criterio de comparación del prototipo. No es la probabilidad de éxito ni el rendimiento
        esperado.
      </p>

      <Eyebrow className="mb-3 mt-8">Calendario · dos campañas</Eyebrow>
      {assumedStart && firstStart && (
        <p className="mb-3 font-mono text-base font-medium text-ambar">
          Fecha de inicio supuesta: {formatDay(firstStart)}
        </p>
      )}
      <CampaignCalendar campaigns={a.campaigns} />

      <Eyebrow tone="lima" className="mb-3 mt-8">
        A favor
      </Eyebrow>
      <ul className="space-y-2">
        {a.reasons.map((r, i) => (
          <li key={i} className="flex gap-3">
            <span aria-hidden className="font-mono font-medium text-lima">
              +
            </span>
            <span>{r}</span>
          </li>
        ))}
      </ul>

      <Eyebrow tone="ambar" className="mb-3 mt-8">
        Limitaciones
      </Eyebrow>
      <ul className="space-y-2">
        {a.limitations.map((r, i) => (
          <li key={i} className="flex gap-3">
            <span aria-hidden className="font-mono font-medium text-ambar">
              –
            </span>
            <span>{r}</span>
          </li>
        ))}
      </ul>

      <Eyebrow className="mb-3 mt-8">Fuentes</Eyebrow>
      <SourcesList sources={a.sources} />
    </article>
  )
}
