import type { ReactNode } from 'react'
import { useLanguage } from '../../i18n/LanguageContext'
import { labelClass } from './styles'

interface Props {
  title: string
  message?: ReactNode
  action?: ReactNode
  /** 'insufficient' = datos insuficientes (no se inventan valores). */
  tone?: 'neutral' | 'insufficient'
}

export function EmptyState({ title, message, action, tone = 'neutral' }: Props) {
  const { t } = useLanguage()
  const insufficient = tone === 'insufficient'
  return (
    <div
      className={`border p-5 ${
        insufficient ? 'border-ambar bg-ambar-bg' : 'border-dashed border-edge bg-panel'
      }`}
    >
      {insufficient && <p className={`${labelClass} mb-2 font-medium text-ambar`}>{t('common.insufficientData')}</p>}
      <p className="text-lg font-semibold text-ink">{title}</p>
      {message && <div className="mt-2 text-muted">{message}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
