export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 p-6 text-stone-600">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-campo-600 border-t-transparent" />
      <span>{label}</span>
    </div>
  )
}
