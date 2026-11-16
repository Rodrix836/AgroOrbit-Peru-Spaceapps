import { DICTIONARIES, type Lang, type TKey } from './translations'

// Idioma activo y traducción sin React. Lo fija <LanguageProvider> (de forma síncrona al renderizar) para que las
// utilidades puras (formato de fechas, textos de la guía, frases de compensaciones…) hablen el mismo idioma que los
// componentes, sin cambiar sus firmas. Los componentes usan `useLanguage()` para volver a dibujarse al cambiar de idioma.

let active: Lang = 'en'

export const getLang = (): Lang => active
export function setActiveLang(lang: Lang) {
  active = lang
}

export type TParams = Record<string, string | number>

/** Traduce una clave al idioma activo; `{nombre}` se reemplaza con `params.nombre`. */
export function translate(lang: Lang, key: TKey, params?: TParams): string {
  const text: string = DICTIONARIES[lang][key] ?? DICTIONARIES.en[key] ?? key
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m))
}

/** Igual que `t()` del hook, para código que no es un componente. */
export const tr = (key: TKey, params?: TParams): string => translate(active, key, params)

/** Configuración regional de fechas y números: en-US en inglés, es-PE en español. */
export const localeOf = (lang: Lang = active): string => (lang === 'es' ? 'es-PE' : 'en-US')
