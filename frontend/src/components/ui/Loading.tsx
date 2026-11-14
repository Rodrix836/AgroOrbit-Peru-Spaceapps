export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 p-4 font-medium text-muted">
      <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-brand-600 border-t-transparent" />
      <span>{label}</span>
    </div>
  )
}
