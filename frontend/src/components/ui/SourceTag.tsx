export type SourceKind = 'sensor' | 'nasa' | 'prototype'

const STYLES: Record<SourceKind, string> = {
  sensor: 'bg-campo-100 text-campo-900 border-campo-600',
  nasa: 'bg-nasa-50 text-nasa-700 border-nasa-700',
  prototype: 'bg-stone-100 text-stone-800 border-stone-500',
}

/** Etiqueta de fuente: de dónde sale cada dato. */
export function SourceTag({ kind, label }: { kind: SourceKind; label: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STYLES[kind]}`}
    >
      {label}
    </span>
  )
}
