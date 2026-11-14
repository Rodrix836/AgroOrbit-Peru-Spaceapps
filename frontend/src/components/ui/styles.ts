// Clases compartidas del sistema visual (cadenas completas para que Tailwind las detecte).

export type Tone = 'sensor' | 'nasa' | 'prototype'

export const TONES: Record<
  Tone,
  { badge: string; card: string; title: string; number: string; accent: string }
> = {
  sensor: {
    badge: 'bg-soil-100 text-soil-800 border-soil-600',
    card: 'bg-soil-50 border-soil-200',
    title: 'text-soil-800',
    number: 'text-soil-800',
    accent: 'border-t-soil-600',
  },
  nasa: {
    badge: 'bg-nasa-100 text-nasa-800 border-nasa-600',
    card: 'bg-nasa-50 border-nasa-200',
    title: 'text-nasa-800',
    number: 'text-nasa-800',
    accent: 'border-t-nasa-600',
  },
  prototype: {
    badge: 'bg-brand-100 text-brand-900 border-brand-600',
    card: 'bg-white border-line',
    title: 'text-brand-900',
    number: 'text-brand-900',
    accent: 'border-t-brand-600',
  },
}

export const inputClass =
  'mt-1 w-full rounded-xl border border-stone-400 bg-white px-3 py-2.5 text-ink'

export const cardClass = 'rounded-2xl border border-line bg-white shadow-sm'
