/**
 * AgroOrbit – idioma de la interfaz.
 * <LanguageProvider> + useLanguage() → { lang, setLang, t, formatDateTime }.
 * Idioma por defecto: inglés ('en'). La elección se guarda en localStorage (clave 'agroorbit_lang').
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { formatDateTimeIn } from '../utils/format'
import { setActiveLang, translate, type TParams } from './active'
import type { Lang, TKey } from './translations'

const LS_KEY = 'agroorbit_lang'

function readLang(): Lang {
  try {
    const v = localStorage.getItem(LS_KEY)
    if (v === 'en' || v === 'es') return v
  } catch {
    /* sin almacenamiento: se usa el idioma por defecto */
  }
  return 'en'
}

function writeLang(l: Lang) {
  try {
    localStorage.setItem(LS_KEY, l)
  } catch {
    /* sin almacenamiento: el cambio vale solo para esta visita */
  }
}

interface LangContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  /** Traduce una clave tipada; `{nombre}` se reemplaza con `params.nombre`. */
  t: (key: TKey, params?: TParams) => string
  /**
   * Fecha y hora (ISO 8601, número o Date) en hora de Perú (America/Lima, UTC-5).
   * en-US: «Nov 15, 2026, 07:56 PM» · es-PE: «15 nov. 2026, 07:56 p. m.»
   */
  formatDateTime: (date: string | number | Date, options?: Intl.DateTimeFormatOptions) => string
}

const LangContext = createContext<LangContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang)
  // Se fija antes de dibujar a los hijos, para que las utilidades sin React ya usen el idioma nuevo.
  setActiveLang(lang)

  const setLang = useCallback((l: Lang) => {
    writeLang(l)
    setActiveLang(l)
    setLangState(l)
  }, [])

  // <html lang> sincronizado, por accesibilidad.
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const t = useCallback((key: TKey, params?: TParams) => translate(lang, key, params), [lang])
  const formatDateTime = useCallback(
    (date: string | number | Date, options?: Intl.DateTimeFormatOptions) => formatDateTimeIn(lang, date, options),
    [lang],
  )

  const value = useMemo<LangContextValue>(() => ({ lang, setLang, t, formatDateTime }), [lang, setLang, t, formatDateTime])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLanguage(): LangContextValue {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>')
  return ctx
}

export type { Lang, TKey }
