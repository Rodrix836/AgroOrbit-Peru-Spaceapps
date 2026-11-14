import type { Alternative } from '../../types/api'
import { SourceTag } from '../ui/SourceTag'
import { CampaignCalendar } from './CampaignCalendar'
import { SourcesList } from './SourcesList'

interface Props {
  alternative: Alternative
  selected: boolean
}

export function AlternativeCard({ alternative: a, selected }: Props) {
  return (
    <article
      className={`rounded-2xl border-2 bg-white p-4 shadow-sm ${
        selected ? 'border-campo-700' : 'border-stone-200'
      }`}
    >
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-bold">Alternativa {a.rank}</h3>
        {selected && (
          <span className="rounded-full bg-campo-700 px-2.5 py-0.5 text-xs font-semibold text-white">
            Mejor según el criterio elegido
          </span>
        )}
      </header>

      <p className="mt-2 text-sm text-stone-700">
        Puntaje del prototipo: <strong className="text-base text-stone-900">{a.score} de 100</strong>
      </p>
      <p className="text-xs text-stone-600">
        Es un criterio de comparación del prototipo. No es la probabilidad de éxito ni el rendimiento
        esperado.
      </p>
      <div className="mt-1">
        <SourceTag kind="prototype" label="Motor de reglas del prototipo" />
      </div>

      <h4 className="mt-4 font-semibold">Calendario de dos campañas</h4>
      <div className="mt-1">
        <CampaignCalendar campaigns={a.campaigns} />
      </div>

      <h4 className="mt-4 font-semibold">Por qué</h4>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {a.reasons.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>

      <h4 className="mt-4 font-semibold">Limitaciones</h4>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {a.limitations.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>

      <h4 className="mt-4 font-semibold">Fuentes</h4>
      <SourcesList sources={a.sources} />
    </article>
  )
}
