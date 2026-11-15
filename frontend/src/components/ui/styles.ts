// Clases y constantes compartidas del sistema visual (cadenas completas para Tailwind).

export type Tone = 'sensor' | 'nasa' | 'prototype'

export const TONES: Record<Tone, { text: string; border: string; bg: string; stroke: string }> = {
  sensor: { text: 'text-ambar', border: 'border-ambar', bg: 'bg-ambar', stroke: '#f2b35e' },
  nasa: { text: 'text-cielo', border: 'border-cielo', bg: 'bg-cielo', stroke: '#7fbbff' },
  prototype: { text: 'text-lima', border: 'border-lima', bg: 'bg-lima', stroke: '#c8f169' },
}

/** Etiqueta de sección: mono, mayúsculas, 13 px, tracking 0.12em. */
export const labelClass = 'font-mono text-[13px] uppercase tracking-[0.12em]'

export const inputClass =
  'block w-full min-h-[50px] border border-edge bg-bg px-3 py-2 text-ink placeholder:text-muted'

export const AXIS_TICK = { fill: '#9baaa0', fontFamily: 'IBM Plex Mono, monospace', fontSize: 13 }
export const GRID_STROKE = '#25332b'
export const TOOLTIP_STYLE = {
  background: '#0e1511',
  border: '1px solid #25332b',
  borderRadius: 0,
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: 14,
  color: '#e8efe9',
}
