import { useLanguage } from '../../i18n/LanguageContext'
import type { Lang } from '../../i18n/translations'

const OPTIONS: { lang: Lang; label: string; labelKey: 'nav.langEn' | 'nav.langEs' }[] = [
  { lang: 'en', label: 'EN', labelKey: 'nav.langEn' },
  { lang: 'es', label: 'ES', labelKey: 'nav.langEs' },
]

/** Selector compacto EN | ES (la elección se guarda y cambia toda la interfaz). Zona táctil de 44 px. */
export function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage()
  return (
    <div role="group" aria-label={t('nav.language')} className="inline-flex border border-edge">
      {OPTIONS.map((o, i) => {
        const on = lang === o.lang
        return (
          <button
            key={o.lang}
            type="button"
            onClick={() => setLang(o.lang)}
            aria-pressed={on}
            aria-label={t(o.labelKey)}
            lang={o.lang}
            className={`min-h-[44px] min-w-[44px] px-2 font-mono text-[13px] font-medium tracking-[0.12em] ${
              i === 0 ? '' : 'border-l border-edge'
            } ${on ? 'bg-lima text-bg' : 'bg-bg text-ink hover:text-lima'}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
