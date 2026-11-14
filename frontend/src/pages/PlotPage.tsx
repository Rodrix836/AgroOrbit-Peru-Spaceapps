import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBox } from '../components/ui/ErrorBox'
import { Loading } from '../components/ui/Loading'
import { errorMessage } from '../hooks/useAsync'
import { usePlot } from '../hooks/usePlot'
import type { Irrigation, PlotPreferences, Priority } from '../types/api'

const input = 'mt-1 w-full rounded-lg border border-stone-400 bg-white px-3 py-2'
const primaryBtn =
  'rounded-lg bg-campo-700 px-5 py-3 font-semibold text-white hover:bg-campo-800 disabled:opacity-60'

function NewPlotForm({ onDone }: { onDone?: () => void }) {
  const { createPlot } = usePlot()
  const [name, setName] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const latitude = Number(lat.replace(',', '.'))
    const longitude = Number(lng.replace(',', '.'))
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return setError('La latitud debe ser un número entre -90 y 90.')
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return setError('La longitud debe ser un número entre -180 y 180.')
    }
    setBusy(true)
    setError(null)
    try {
      await createPlot({ name: name.trim(), latitude, longitude })
      setName('')
      setLat('')
      setLng('')
      onDone?.()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4">
      <h3 className="text-lg font-bold">Registrar parcela</h3>
      <label className="block">
        <span className="font-medium">Nombre de la parcela</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} className={input} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="font-medium">Latitud (grados)</span>
          <input
            required
            inputMode="decimal"
            placeholder="ej. -5.20"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className={input}
          />
        </label>
        <label className="block">
          <span className="font-medium">Longitud (grados)</span>
          <input
            required
            inputMode="decimal"
            placeholder="ej. -80.63"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className={input}
          />
        </label>
      </div>
      <p className="text-sm text-stone-600">Usa las coordenadas reales de tu parcela, no las del pueblo.</p>
      {error && <ErrorBox message={error} />}
      <button disabled={busy} className={primaryBtn}>
        {busy ? 'Guardando…' : 'Guardar parcela'}
      </button>
    </form>
  )
}

const IRRIGATION: { value: Irrigation; label: string }[] = [
  { value: 'available', label: 'Sí, tengo riego disponible' },
  { value: 'limited', label: 'Riego limitado' },
  { value: 'none', label: 'No tengo riego (solo lluvia)' },
]
const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'save_water', label: 'Ahorrar agua' },
  { value: 'improve_soil', label: 'Mejorar el suelo' },
]

function PrefsForm() {
  const { plot, crops, prefs, savePrefs } = usePlot()
  const [form, setForm] = useState<PlotPreferences>(prefs)
  const [saved, setSaved] = useState(false)

  useEffect(() => setForm(prefs), [plot?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof PlotPreferences>(k: K, v: PlotPreferences[K]) => {
    setSaved(false)
    setForm((f) => ({ ...f, [k]: v }))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    savePrefs(form)
    setSaved(true)
  }

  const cropSelect = (value: string, onChange: (v: string) => void) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={input}>
      <option value="">No sé / no aplica</option>
      {crops.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  )

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4">
      <h3 className="text-lg font-bold">Campaña de «{plot?.name}»</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="font-medium">Cultivo anterior</span>
          {cropSelect(form.previousCropId, (v) => set('previousCropId', v))}
        </label>
        <label className="block">
          <span className="font-medium">Cultivo actual</span>
          {cropSelect(form.currentCropId, (v) => set('currentCropId', v))}
        </label>
      </div>
      <label className="block">
        <span className="font-medium">Disponibilidad de riego</span>
        <select
          value={form.irrigation}
          onChange={(e) => set('irrigation', e.target.value as Irrigation)}
          className={input}
        >
          {IRRIGATION.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="font-medium">Fecha prevista de inicio de la siguiente campaña</span>
        <input
          type="date"
          value={form.startOn}
          onChange={(e) => set('startOn', e.target.value)}
          className={input}
        />
      </label>
      <fieldset>
        <legend className="font-medium">¿Qué es más importante para ti?</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {PRIORITIES.map((p) => (
            <label
              key={p.value}
              className={`cursor-pointer rounded-lg border-2 px-4 py-2 font-semibold ${
                form.priority === p.value
                  ? 'border-campo-700 bg-campo-100 text-campo-900'
                  : 'border-stone-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="priority"
                className="sr-only"
                checked={form.priority === p.value}
                onChange={() => set('priority', p.value)}
              />
              {p.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button className={primaryBtn}>Guardar</button>
        {saved && (
          <>
            <span role="status" className="text-campo-800">
              Guardado en este navegador.
            </span>
            <Link to="/rotaciones" className="font-semibold text-campo-800 underline">
              Ver rotaciones →
            </Link>
          </>
        )}
      </div>
    </form>
  )
}

export function PlotPage() {
  const { plot, loading, error, reload } = usePlot()
  const [adding, setAdding] = useState(false)

  if (loading) return <Loading label="Cargando tus parcelas…" />
  if (error) return <ErrorBox message={error} onRetry={reload} />

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">Mi parcela</h2>
      {!plot ? (
        <>
          <p className="text-stone-700">Aún no tienes parcelas. Registra la primera para empezar.</p>
          <NewPlotForm />
        </>
      ) : (
        <>
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-lg font-bold">{plot.name}</p>
            <p className="text-stone-700">
              Ubicación: {plot.latitude}°, {plot.longitude}°
            </p>
          </div>
          <PrefsForm />
          {adding ? (
            <NewPlotForm onDone={() => setAdding(false)} />
          ) : (
            <button onClick={() => setAdding(true)} className="font-semibold text-campo-800 underline">
              + Registrar otra parcela
            </button>
          )}
        </>
      )}
    </div>
  )
}
