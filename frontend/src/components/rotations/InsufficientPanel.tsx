import type { Crop, MissingItem } from '../../types/api'
import { ButtonLink } from '../ui/Button'
import { Eyebrow } from '../ui/Eyebrow'
import type { TKey } from '../../i18n/translations'
import { fieldGroup, fieldLabel, type MissingGroup } from './labels'
import { useLanguage } from '../../i18n/LanguageContext'
import { td } from '../../i18n/dataText'

const GROUPS = [
  { id: 'plot', titleKey: 'insuf.group.plot' },
  { id: 'crops', titleKey: 'insuf.group.crops' },
  { id: 'climate', titleKey: 'insuf.group.climate' },
  { id: 'system', titleKey: 'insuf.group.system' },
  { id: 'other', titleKey: 'insuf.group.other' },
] as const satisfies readonly { id: MissingGroup; titleKey: TKey }[]

/**
 * Estado insufficient_data: sin tarjetas ni puntajes. Lista lo que falta y por qué,
 * agrupado; los datos de la parcela llevan enlace a 01 Parcela.
 */
export function InsufficientPanel({ missing, crops }: { missing: MissingItem[]; crops: Crop[] }) {
  const { t } = useLanguage()
  return (
    <section className="border-l-4 border-ambar bg-ambar-bg p-6 md:p-8">
      <Eyebrow tone="ambar" className="mb-3">
        {t('common.insufficientData')}
      </Eyebrow>
      <h2 className="font-display text-[clamp(28px,4vw,40px)] font-extrabold leading-none tracking-[-0.03em] text-ink">
        {t('insuf.heading')}
      </h2>
      <p className="mt-3 max-w-prose text-ink">
        {t('insuf.body')}
      </p>

      <div className="mt-6 space-y-6">
        {GROUPS.map((g) => {
          const items = missing.filter((m) => fieldGroup(m.field) === g.id)
          if (items.length === 0) return null
          return (
            <div key={g.id}>
              <Eyebrow tone="ambar" className="mb-2">
                {t(g.titleKey)}
              </Eyebrow>
              <ul className="space-y-2">
                {items.map((m, i) => (
                  <li key={`${m.field}-${i}`} className="flex gap-3">
                    <span aria-hidden className="font-mono text-ambar">
                      –
                    </span>
                    <span>
                      <span className="font-medium text-ink">{fieldLabel(m.field, crops)}.</span>{' '}
                      <span className="text-ink">{td(m.reason)}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {g.id === 'plot' && (
                <ButtonLink to="/parcela" variant="amber" size="lg" className="mt-4">
                  {t('insuf.completeInPlot')}
                </ButtonLink>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
