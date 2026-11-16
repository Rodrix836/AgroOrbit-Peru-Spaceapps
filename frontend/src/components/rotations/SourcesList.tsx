import type { SourceRef } from '../../types/api'
import { useLanguage } from '../../i18n/LanguageContext'
import { td } from '../../i18n/dataText'

export function SourcesList({ sources }: { sources: SourceRef[] }) {
  const { t } = useLanguage()
  if (sources.length === 0) {
    return <p className="text-muted">{t('sources.none')}</p>
  }
  return (
    <ul className="space-y-1">
      {sources.map((s, i) => (
        <li key={i} className="flex gap-3">
          {s.url ? (
            <>
              <span aria-hidden className="font-mono text-cielo">
                ↗
              </span>
              <a href={s.url} target="_blank" rel="noreferrer" className="text-cielo underline">
                {td(s.title)}
              </a>
            </>
          ) : (
            // Sin enlace verificado: texto plano, sin flecha ni subrayado (no parece una cita real).
            <span className="pl-6 text-muted">{td(s.title)}</span>
          )}
        </li>
      ))}
    </ul>
  )
}
