import { labelClass } from './styles'

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div role="status" className={`flex items-center gap-3 py-4 text-lima ${labelClass}`}>
      <span aria-hidden className="h-3 w-3 animate-pulse bg-lima" />
      <span>{label}</span>
    </div>
  )
}
