import type { Crop, MissingItem } from '../../types/api'
import { ButtonLink } from '../ui/Button'
import { Eyebrow } from '../ui/Eyebrow'
import { fieldGroup, fieldLabel, type MissingGroup } from './labels'

const GROUPS: { id: MissingGroup; title: string }[] = [
  { id: 'plot', title: 'Datos de tu parcela' },
  { id: 'crops', title: 'Requisitos de cultivos sin fuente verificada' },
  { id: 'climate', title: 'Clima' },
  { id: 'system', title: 'Sistema' },
  { id: 'other', title: 'Otros datos' },
]

/**
 * Estado insufficient_data: sin tarjetas ni puntajes. Lista lo que falta y por qué,
 * agrupado; los datos de la parcela llevan enlace a 01 Parcela.
 */
export function InsufficientPanel({ missing, crops }: { missing: MissingItem[]; crops: Crop[] }) {
  return (
    <section className="border-l-4 border-ambar bg-ambar-bg p-6 md:p-8">
      <Eyebrow tone="ambar" className="mb-3">
        Datos insuficientes
      </Eyebrow>
      <h2 className="font-display text-[clamp(28px,4vw,40px)] font-extrabold leading-none tracking-[-0.03em] text-ink">
        Todavía no podemos comparar rotaciones
      </h2>
      <p className="mt-3 max-w-prose text-ink">
        Faltan datos para comparar. No inventamos valores para completar lo que falta, y por eso no mostramos
        alternativas ni puntajes.
      </p>

      <div className="mt-6 space-y-6">
        {GROUPS.map((g) => {
          const items = missing.filter((m) => fieldGroup(m.field) === g.id)
          if (items.length === 0) return null
          return (
            <div key={g.id}>
              <Eyebrow tone="ambar" className="mb-2">
                {g.title}
              </Eyebrow>
              <ul className="space-y-2">
                {items.map((m, i) => (
                  <li key={`${m.field}-${i}`} className="flex gap-3">
                    <span aria-hidden className="font-mono text-ambar">
                      –
                    </span>
                    <span>
                      <span className="font-medium text-ink">{fieldLabel(m.field, crops)}.</span>{' '}
                      <span className="text-ink">{m.reason}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {g.id === 'plot' && (
                <ButtonLink to="/parcela" variant="amber" size="lg" className="mt-4">
                  Completar en Parcela →
                </ButtonLink>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
