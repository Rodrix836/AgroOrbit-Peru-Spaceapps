import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../services/api'
import type { Crop, CropCyclesResponse, Plot, PlotInput, PlotUpdate } from '../types/api'
import { errorMessage, useAsync } from './useAsync'
import { useAuth } from './useAuth'

const SEL_KEY = 'agroorbit.plotId'
/** Prefijo de lo que antes se guardaba en el navegador (cultivos y fecha). Ya no se usa: se borra. */
const OLD_PREFS_PREFIX = 'agroorbit.prefs.'

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

/** Borra los cultivos y la fecha que se guardaban en el navegador (usaban ids antiguos; no se migran). */
function clearOldPrefs() {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(OLD_PREFS_PREFIX)) keys.push(k)
    }
    keys.forEach((k) => localStorage.removeItem(k))
  } catch {
    /* sin almacenamiento */
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
  /** Vuelve a leer la parcela desde la API (GET /api/plots/{id}). */
  refreshPlot: () => Promise<void>
  /** Ciclos de cultivo de la parcela: anterior, actual y próxima campaña (GET .../crop-cycles). */
  cycles: CropCyclesResponse | null
  cyclesLoading: boolean
  cyclesError: string | null
  /** Vuelve a leer los ciclos sin vaciar la pantalla. */
  reloadCycles: () => Promise<void>
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

  useEffect(clearOldPrefs, [])

  // Parcelas ya guardadas con PATCH: la respuesta de la API reemplaza a la de la lista.
  const [updated, setUpdated] = useState<Record<string, Plot>>({})

  const plots = (plotsQ.data ?? []).map((p) => updated[p.id] ?? p)
  const plot = plots.find((p) => p.id === selectedId) ?? plots[0] ?? null
  const plotId = plot?.id

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

  const updatePlot = useCallback(
    async (patch: PlotUpdate) => {
      if (!plotId) throw new Error('No hay parcela seleccionada.')
      const saved = await api.updatePlot(plotId, patch)
      setUpdated((u) => ({ ...u, [saved.id]: saved }))
      return saved
    },
    [plotId],
  )

  const refreshPlot = useCallback(async () => {
    if (!plotId) return
    const fresh = await api.getPlot(plotId)
    setUpdated((u) => ({ ...u, [fresh.id]: fresh }))
  }, [plotId])

  // Ciclos de cultivo de la parcela elegida.
  const [cycles, setCycles] = useState<CropCyclesResponse | null>(null)
  const [cyclesLoading, setCyclesLoading] = useState(false)
  const [cyclesError, setCyclesError] = useState<string | null>(null)
  const cyclesRun = useRef(0)

  const loadCycles = useCallback(
    async (initial: boolean) => {
      const run = ++cyclesRun.current
      if (!plotId) {
        setCycles(null)
        setCyclesLoading(false)
        return
      }
      if (initial) {
        setCycles(null)
        setCyclesLoading(true)
        setCyclesError(null)
      }
      try {
        const data = await api.getCropCycles(plotId)
        if (run === cyclesRun.current) {
          setCycles(data)
          setCyclesError(null)
        }
      } catch (e) {
        if (run === cyclesRun.current) setCyclesError(errorMessage(e))
      } finally {
        if (run === cyclesRun.current) setCyclesLoading(false)
      }
    },
    [plotId],
  )

  // Descarta respuestas que lleguen tras cambiar de parcela o desmontar.
  const invalidateCycles = useCallback(() => {
    cyclesRun.current++
  }, [])

  useEffect(() => {
    void loadCycles(true)
    return invalidateCycles
  }, [loadCycles, invalidateCycles])

  const reloadCycles = useCallback(() => loadCycles(false), [loadCycles])

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
    refreshPlot,
    cycles,
    cyclesLoading,
    cyclesError,
    reloadCycles,
  }
  return <PlotContext.Provider value={value}>{children}</PlotContext.Provider>
}

export function usePlot(): PlotState {
  const ctx = useContext(PlotContext)
  if (!ctx) throw new Error('usePlot debe usarse dentro de PlotProvider')
  return ctx
}
