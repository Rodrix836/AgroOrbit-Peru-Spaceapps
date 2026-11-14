import type { ReactNode } from 'react'
import { Eyebrow } from './Eyebrow'

/** Cabecera de página: etiqueta mono lima ("02 / DIAGNÓSTICO") y h1 grande. */
export function PageHeader({
  index,
  label,
  title,
  aside,
}: {
  index: string
  label: string
  title: string
  aside?: ReactNode
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-6 md:mb-10">
      <div className="min-w-0">
        <Eyebrow tone="lima">
          {index} / {label}
        </Eyebrow>
        <h1 className="mt-3 font-display text-[clamp(38px,7vw,60px)] font-extrabold leading-none tracking-[-0.03em]">
          {title}
        </h1>
      </div>
      {aside}
    </header>
  )
}
