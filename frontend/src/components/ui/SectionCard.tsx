import type { ReactNode } from 'react'
import { SourceBadge } from './SourceBadge'
import { TONES, type Tone } from './styles'

interface Props {
  title: string
  description?: string
  /** Etiqueta de fuente junto al título. */
  source?: Tone
  /** Color del bloque: tierra (sensor), azul (NASA) o neutro. */
  tone?: Tone
  /** Botones u otros controles a la derecha del título. */
  actions?: ReactNode
  children: ReactNode
}

export function SectionCard({ title, description, source, tone = 'prototype', actions, children }: Props) {
  const t = TONES[tone]
  return (
    <section className={`rounded-2xl border border-t-8 p-4 shadow-sm sm:p-5 ${t.card} ${t.accent}`}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`text-xl font-bold ${t.title}`}>{title}</h3>
            {source && <SourceBadge kind={source} />}
          </div>
          {description && <p className="mt-1 text-muted">{description}</p>}
        </div>
        {actions}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  )
}
