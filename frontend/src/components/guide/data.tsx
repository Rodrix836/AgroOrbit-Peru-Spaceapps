import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { PageData } from './questions'

// Puente de datos para la Guía: cada pantalla «publica» lo que ya tiene cargado (sensor, NASA, evaluación…) y la guía
// lo lee al responder. No hace peticiones propias: si una pantalla no cargó algo, la guía lo dice.

const DataContext = createContext<PageData>({})
const PublishContext = createContext<<K extends keyof PageData>(key: K, value: PageData[K]) => void>(() => {})

export function GuideDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PageData>({})
  const publish = useCallback(<K extends keyof PageData>(key: K, value: PageData[K]) => {
    setData((d) => (d[key] === value ? d : { ...d, [key]: value }))
  }, [])
  return (
    <PublishContext.Provider value={publish}>
      <DataContext.Provider value={data}>{children}</DataContext.Provider>
    </PublishContext.Provider>
  )
}

/** Lo publicado por las pantallas (lo usa la guía). */
export const useGuidePageData = () => useContext(DataContext)

/**
 * Publica para la guía un dato de la pantalla. Pasa un valor estable (useMemo) para no repetir la publicación.
 * Al salir de la pantalla se retira, para que la guía no responda con datos de otra pantalla.
 */
export function usePublishGuide<K extends keyof PageData>(key: K, value: PageData[K]) {
  const publish = useContext(PublishContext)
  useEffect(() => {
    publish(key, value)
  }, [publish, key, value])
  useEffect(() => () => publish(key, undefined), [publish, key])
}
