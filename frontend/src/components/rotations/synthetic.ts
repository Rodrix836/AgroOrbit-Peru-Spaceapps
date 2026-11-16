import type { SourceRef } from '../../types/api'
import { tr } from '../../i18n/active'

/** Los textos de prueba del motor empiezan por «SYNTHETIC». */
export const isSynthetic = (text: string): boolean => /^\s*SYNTHETIC\b/.test(text)

/** Quita el prefijo en inglés: «SYNTHETIC clima: …» → «Clima: …». */
export function stripSynthetic(text: string): string {
  const t = text.replace(/^\s*SYNTHETIC\s*/, '').trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Fuente de prueba: dominio example.invalid o título que empieza por «SYNTHETIC». No se enlaza. */
export function isTestSource(s: SourceRef): boolean {
  if (isSynthetic(s.title)) return true
  try {
    return !!s.url && new URL(s.url).hostname.endsWith('example.invalid')
  } catch {
    return false
  }
}

export const testSourceTitle = (): string => tr('synth.testSource')

/** Las fuentes de prueba pasan a «Fuente de prueba (no agronómica)», sin enlace; las demás se dejan tal cual. */
export const displaySources = (sources: SourceRef[]): SourceRef[] =>
  sources.map((s) => (isTestSource(s) ? { title: testSourceTitle() } : s))
