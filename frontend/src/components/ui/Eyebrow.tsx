import type { ReactNode } from 'react'
import { labelClass } from './styles'

const COLORS = {
  lima: 'text-lima',
  ambar: 'text-ambar',
  cielo: 'text-cielo',
  muted: 'text-muted',
}

/** Etiqueta de sección en mono mayúsculas. */
export function Eyebrow({
  tone = 'muted',
  children,
  className = '',
}: {
  tone?: keyof typeof COLORS
  children: ReactNode
  className?: string
}) {
  return <p className={`${labelClass} ${COLORS[tone]} ${className}`}>{children}</p>
}
