import type { ReactNode } from 'react'

type AlertTone = 'warn' | 'danger' | 'nodata'

const STYLES: Record<AlertTone, string> = {
  warn: 'border-warn-700 bg-warn-50 text-warn-900',
  danger: 'border-danger-700 bg-danger-50 text-danger-900',
  nodata: 'border-nodata-700 bg-nodata-50 text-nodata-900',
}

/** Aviso en línea con los colores de estado del sistema. */
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
  return (
    <div role={role} className={`rounded-xl border-l-8 p-4 ${STYLES[tone]}`}>
      {title && <p className="font-bold">{title}</p>}
      {children && <div className={title ? 'mt-1' : ''}>{children}</div>}
    </div>
  )
}
