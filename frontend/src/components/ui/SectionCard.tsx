import type { ReactNode } from 'react'
import { TONES, labelClass, type Tone } from './styles'

interface Props {
  /** Etiqueta de sección en mayúsculas, p. ej. "SUELO · SENSOR ESP32". */
  title: string
  description?: string
  /** ámbar = sensor, cielo = NASA, lima = prototipo. */
  tone?: Tone
  /** Botones u otros controles junto al título. */
  actions?: ReactNode
  children: ReactNode
}

/** Panel plano (sin radio ni sombra) con etiqueta de sección coloreada por fuente. */
export function SectionCard({ title, description, tone = 'prototype', actions, children }: Props) {
  return (
    <section className="min-w-0 bg-panel p-6 md:p-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className={`${labelClass} font-medium ${TONES[tone].text}`}>{title}</h2>
          {description && <p className="mt-2 max-w-prose text-muted">{description}</p>}
        </div>
        {actions}
      </header>
      <div className="space-y-6">{children}</div>
    </section>
  )
}
