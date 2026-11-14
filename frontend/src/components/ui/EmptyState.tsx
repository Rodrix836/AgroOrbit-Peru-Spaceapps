import type { ReactNode } from 'react'

interface Props {
  title: string
  message?: ReactNode
  action?: ReactNode
  /** Resalta el estado de "datos insuficientes" (no se inventan valores). */
  tone?: 'neutral' | 'warning'
}

export function EmptyState({ title, message, action, tone = 'neutral' }: Props) {
  const colors =
    tone === 'warning'
      ? 'border-amber-300 bg-amber-50 text-amber-900'
      : 'border-stone-300 bg-white text-stone-700'
  return (
    <div className={`rounded-xl border border-dashed p-6 ${colors}`}>
      <p className="text-lg font-semibold">{title}</p>
      {message && <div className="mt-1">{message}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
