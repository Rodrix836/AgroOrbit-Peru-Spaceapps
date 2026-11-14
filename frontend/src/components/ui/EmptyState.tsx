import type { ReactNode } from 'react'

interface Props {
  title: string
  message?: ReactNode
  action?: ReactNode
  /** 'insufficient' = datos insuficientes (no se inventan valores). */
  tone?: 'neutral' | 'insufficient'
}

export function EmptyState({ title, message, action, tone = 'neutral' }: Props) {
  const colors =
    tone === 'insufficient'
      ? 'border-nodata-700 bg-nodata-50 text-nodata-900'
      : 'border-stone-400 bg-white text-ink'
  return (
    <div className={`rounded-2xl border-2 border-dashed p-5 ${colors}`}>
      <p className="text-lg font-bold">{title}</p>
      {message && <div className="mt-1">{message}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
