import type { SourceRef } from '../../types/api'

export function SourcesList({ sources }: { sources: SourceRef[] }) {
  if (sources.length === 0) {
    return <p className="text-muted">Sin fuentes registradas.</p>
  }
  return (
    <ul className="space-y-1">
      {sources.map((s, i) => (
        <li key={i} className="flex gap-3">
          {s.url ? (
            <>
              <span aria-hidden className="font-mono text-cielo">
                ↗
              </span>
              <a href={s.url} target="_blank" rel="noreferrer" className="text-cielo underline">
                {s.title}
              </a>
            </>
          ) : (
            // Sin enlace verificado: texto plano, sin flecha ni subrayado (no parece una cita real).
            <span className="pl-6 text-muted">{s.title}</span>
          )}
        </li>
      ))}
    </ul>
  )
}
