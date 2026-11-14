import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { api } from '../services/api'
import type { Crop, Plot, PlotInput, PlotPreferences, Priority } from '../types/api'
import { useAsync } from './useAsync'
import { useAuth } from './useAuth'

const SEL_KEY = 'agroorbit.plotId'
const prefsKey = (id: string) => `agroorbit.prefs.${id}`

export const DEFAULT_PREFS: PlotPreferences = {
  previousCropId: '',
  currentCropId: '',
  waterAvailability: '', // sin indicar: no se inventa un valor
  startOn: '',
  priority: 'save_water',
}

/** Valores iniciales: lo que la API ya guardó en la parcela (si es una prioridad que ofrece la interfaz). */
function prefsFromPlot(plot: Plot): PlotPreferences {
  const priority: Priority =
    plot.priority === 'save_water' || plot.priority === 'improve_soil' ? plot.priority : DEFAULT_PREFS.priority
  return { ...DEFAULT_PREFS, waterAvailability: plot.water_availability ?? '', priority }
}

/** Nombre para el perfil: la parte del correo antes de la @. */
function displayNameFromEmail(email: string | undefined): string {
  const name = (email ?? '').split('@')[0].trim()
  return name || 'Agricultor'
}

function readLS(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function writeLS(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* sin almacenamiento: se sigue funcionando */
  }
}

interface PlotState {
  plots: Plot[]
  plot: Plot | null
  crops: Crop[]
  loading: boolean
  error: string | null
  reload: () => void
  selectPlot: (id: string) => void
  createPlot: (input: PlotInput) => Promise<Plot>
  prefs: PlotPreferences
  /**
   * Preferencias de la parcela (cultivos, disponibilidad de agua, inicio, prioridad).
   * La API no tiene PATCH de parcelas ni crop-cycles todavía (PENDIENTE BACKEND):
   * mientras tanto se guardan solo en este navegador.
   */
  savePrefs: (prefs: PlotPreferences) => void
}

const PlotContext = createContext<PlotState | null>(null)

export function PlotProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const displayName = displayNameFromEmail(user?.email)
  // El perfil debe existir antes de listar o crear parcelas (si no: 404 profile_not_found).
  const plotsQ = useAsync(async () => {
    await api.ensureProfile(displayName)
    return api.listPlots()
  }, [])
  const cropsQ = useAsync(() => api.listCrops(), [])
  const [selectedId, setSelectedId] = useState<string | null>(() => readLS(SEL_KEY))
  const [prefsVersion, setPrefsVersion] = useState(0)

  const plots = plotsQ.data ?? []
  const plot = plots.find((p) => p.id === selectedId) ?? plots[0] ?? null

  const prefs: PlotPreferences = (() => {
    void prefsVersion
    if (!plot) return DEFAULT_PREFS
    const initial = prefsFromPlot(plot)
    const raw = readLS(prefsKey(plot.id))
    if (!raw) return initial
    try {
      return { ...initial, ...(JSON.parse(raw) as Partial<PlotPreferences>) }
    } catch {
      return initial
    }
  })()

  const selectPlot = useCallback((id: string) => {
    setSelectedId(id)
    writeLS(SEL_KEY, id)
  }, [])

  const createPlot = useCallback(
    async (input: PlotInput) => {
      const created = await api.createPlot(input)
      selectPlot(created.id)
      plotsQ.reload()
      return created
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectPlot],
  )

  const savePrefs = useCallback(
    (next: PlotPreferences) => {
      if (!plot) return
      writeLS(prefsKey(plot.id), JSON.stringify(next))
      setPrefsVersion((v) => v + 1)
    },
    [plot],
  )

  const value: PlotState = {
    plots,
    plot,
    crops: cropsQ.data ?? [],
    loading: plotsQ.loading,
    error: plotsQ.error,
    reload: plotsQ.reload,
    selectPlot,
    createPlot,
    prefs,
    savePrefs,
  }
  return <PlotContext.Provider value={value}>{children}</PlotContext.Provider>
}

export function usePlot(): PlotState {
  const ctx = useContext(PlotContext)
  if (!ctx) throw new Error('usePlot debe usarse dentro de PlotProvider')
  return ctx
}
