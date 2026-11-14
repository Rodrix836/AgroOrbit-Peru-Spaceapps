import type { SourceRef } from '../../types/api'

export function SourcesList({ sources }: { sources: SourceRef[] }) {
  if (sources.length === 0) {
    return <p className="text-muted">Sin fuentes registradas para esta alternativa.</p>
  }
  return (
    <ul className="list-disc space-y-1 pl-5">
      {sources.map((s, i) => (
        <li key={i}>
          {s.url ? (
            <a href={s.url} target="_blank" rel="noreferrer" className="font-medium text-nasa-700 underline">
              {s.title}
            </a>
          ) : (
            s.title
          )}
        </li>
      ))}
    </ul>
  )
}
