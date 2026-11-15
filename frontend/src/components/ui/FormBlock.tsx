import type { ReactNode } from 'react'
import { Eyebrow } from './Eyebrow'

/** Bloque de formulario marcado con una letra grande gris (A, B, C) y su nombre en mono lima. */
export function FormBlock({ letter, name, children }: { letter: string; name: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line py-8 md:grid-cols-[120px_1fr] md:gap-8">
      <div className="flex items-baseline gap-4 md:block">
        <span
          aria-hidden
          className="block font-display text-[72px] font-extrabold leading-none tracking-[-0.04em] text-edge md:text-[96px]"
        >
          {letter}
        </span>
        <Eyebrow tone="lima" className="md:mt-2">
          {name}
        </Eyebrow>
      </div>
      <div className="min-w-0 space-y-5">{children}</div>
    </section>
  )
}
