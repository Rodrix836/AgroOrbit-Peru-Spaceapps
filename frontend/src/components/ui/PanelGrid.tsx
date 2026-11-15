import type { ReactNode } from 'react'

/** Paneles lado a lado separados por una línea de 1 px (gap sobre fondo de línea). */
export function PanelGrid({ children, className = 'lg:grid-cols-2' }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-1 gap-px border border-line bg-line ${className}`}>{children}</div>
}
