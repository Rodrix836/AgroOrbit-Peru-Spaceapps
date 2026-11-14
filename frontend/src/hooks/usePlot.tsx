import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { api } from '../services/api'
import type { Crop, Plot, PlotInput, PlotPreferences, PlotUpdate } from '../types/api'
import { useAsync } from './useAsync'
import { useAuth } from './useAuth'

const SEL_KEY = 'agroorbit.plotId'
const prefsKey = (id: string) => `agroorbit.prefs.${id}`

export const DEFAULT_PREFS: PlotPreferences = {
  previousCropId: '',
  currentCropId: '',
  startOn: '',
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
  /** Error al cargar el catálogo de cultivos (los selectores quedan solo con «No sé»). */
  cropsError: string | null
  loading: boolean
  error: string | null
  reload: () => void
  selectPlot: (id: string) => void
  createPlot: (input: PlotInput) => Promise<Plot>
  /** Guarda en la API los campos enviados (PATCH) y actualiza la parcela con la respuesta. */
  updatePlot: (patch: PlotUpdate) => Promise<Plot>
  prefs: PlotPreferences
  /**
   * Cultivo anterior, cultivo actual y fecha de la próxima campaña.
   * La API aún no tiene dónde guardarlos (falta la tabla crop_cycle): solo en este navegador.
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

  // Parcelas ya guardadas con PATCH: la respuesta de la API reemplaza a la de la lista.
  const [updated, setUpdated] = useState<Record<string, Plot>>({})

  const plots = (plotsQ.data ?? []).map((p) => updated[p.id] ?? p)
  const plot = plots.find((p) => p.id === selectedId) ?? plots[0] ?? null

  const prefs: PlotPreferences = (() => {
    void prefsVersion
    if (!plot) return DEFAULT_PREFS
    const raw = readLS(prefsKey(plot.id))
    if (!raw) return DEFAULT_PREFS
    try {
      const stored = JSON.parse(raw) as Partial<PlotPreferences>
      return {
        previousCropId: stored.previousCropId ?? '',
        currentCropId: stored.currentCropId ?? '',
        startOn: stored.startOn ?? '',
      }
    } catch {
      return DEFAULT_PREFS
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

  const plotId = plot?.id
  const updatePlot = useCallback(
    async (patch: PlotUpdate) => {
      if (!plotId) throw new Error('No hay parcela seleccionada.')
      const saved = await api.updatePlot(plotId, patch)
      setUpdated((u) => ({ ...u, [saved.id]: saved }))
      return saved
    },
    [plotId],
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
    cropsError: cropsQ.error,
    loading: plotsQ.loading,
    error: plotsQ.error,
    reload: plotsQ.reload,
    selectPlot,
    createPlot,
    updatePlot,
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
