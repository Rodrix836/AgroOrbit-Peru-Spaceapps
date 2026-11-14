import type { Alternative } from '../../types/api'
import { SourceBadge } from '../ui/SourceBadge'
import { CampaignCalendar } from './CampaignCalendar'
import { SourcesList } from './SourcesList'

interface Props {
  alternative: Alternative
  selected: boolean
}

export function AlternativeCard({ alternative: a, selected }: Props) {
  return (
    <article
      className={`rounded-2xl border-2 bg-white p-4 shadow-sm sm:p-5 ${
        selected ? 'border-brand-700' : 'border-line'
      }`}
    >
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="text-xl font-bold text-brand-900">Alternativa {a.rank}</h3>
        {selected && (
          <span className="rounded-full bg-brand-700 px-3 py-0.5 font-semibold text-white">
            Mejor según el criterio elegido
          </span>
        )}
      </header>

      <p className="mt-3 flex items-baseline gap-1.5 text-brand-900">
        <span className="text-4xl font-extrabold tracking-tight">{a.score}</span>
        <span className="text-base font-semibold text-muted">de 100 · puntaje del prototipo</span>
      </p>
      <p className="text-muted">
        Es un criterio de comparación del prototipo. No es la probabilidad de éxito ni el rendimiento
        esperado.
      </p>
      <div className="mt-2">
        <SourceBadge kind="prototype" label="Motor de reglas del prototipo" />
      </div>

      <h4 className="mt-5 font-bold">Calendario de dos campañas</h4>
      <div className="mt-2">
        <CampaignCalendar campaigns={a.campaigns} />
      </div>

      <h4 className="mt-5 font-bold">Por qué</h4>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {a.reasons.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>

      <h4 className="mt-5 font-bold">Limitaciones</h4>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {a.limitations.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>

      <h4 className="mt-5 font-bold">Fuentes</h4>
      <div className="mt-1">
        <SourcesList sources={a.sources} />
      </div>
    </article>
  )
}
