import type { ReactNode } from 'react'
import { labelClass } from './styles'

type AlertTone = 'warn' | 'danger' | 'nodata'

const STYLES: Record<AlertTone, { box: string; label: string }> = {
  warn: { box: 'border-ambar bg-ambar-bg', label: 'text-ambar' },
  nodata: { box: 'border-ambar bg-ambar-bg', label: 'text-ambar' },
  danger: { box: 'border-error bg-error-bg', label: 'text-error' },
}

/** Aviso en línea: ámbar para avisos y datos insuficientes, coral para errores. */
export function Alert({
  tone,
  title,
  children,
  role = 'status',
}: {
  tone: AlertTone
  title?: string
  children?: ReactNode
  role?: 'status' | 'alert'
}) {
  const s = STYLES[tone]
  return (
    <div role={role} className={`border border-l-4 p-4 ${s.box}`}>
      {title && <p className={`${labelClass} font-medium ${s.label}`}>{title}</p>}
      {children && <div className={title ? 'mt-2 text-ink' : 'text-ink'}>{children}</div>}
    </div>
  )
}
