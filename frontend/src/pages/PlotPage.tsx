import { useEffect, useState, type FormEvent } from 'react'
import { MapFrame } from '../components/plot/MapFrame'
import { WATER_OPTIONS } from '../components/plot/water'
import { Button, ButtonLink } from '../components/ui/Button'
import { ErrorBox } from '../components/ui/ErrorBox'
import { Eyebrow } from '../components/ui/Eyebrow'
import { FormBlock } from '../components/ui/FormBlock'
import { Loading } from '../components/ui/Loading'
import { PageHeader } from '../components/ui/PageHeader'
import { SourceBadge } from '../components/ui/SourceBadge'
import { inputClass } from '../components/ui/styles'
import { errorMessage } from '../hooks/useAsync'
import { usePlot } from '../hooks/usePlot'
import type { PlotPreferences, Priority, WaterAvailability } from '../types/api'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-medium text-ink">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

/** Campos y botón para registrar una parcela nueva (se muestra dentro del bloque A). */
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
    <form onSubmit={submit} className="grid gap-6 md:grid-cols-2">
      <div className="space-y-5">
        <Field label="Nombre de la parcela">
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Latitud (grados)">
            <input
              required
              inputMode="decimal"
              placeholder="ej. -5.20"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className={`${inputClass} font-mono`}
            />
          </Field>
          <Field label="Longitud (grados)">
            <input
              required
              inputMode="decimal"
              placeholder="ej. -80.63"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className={`${inputClass} font-mono`}
            />
          </Field>
        </div>
        <p className="text-muted">Usa las coordenadas reales de tu parcela, no las del pueblo.</p>
        {error && <ErrorBox message={error} />}
        <Button size="lg" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar parcela →'}
        </Button>
      </div>
      <MapFrame lat={lat.trim() === '' ? null : lat} lng={lng.trim() === '' ? null : lng} />
    </form>
  )
}

const PRIORITIES: { value: Priority; label: string; hint: string }[] = [
  { value: 'save_water', label: 'Ahorrar agua', hint: 'Da más peso al uso de agua al comparar.' },
  { value: 'improve_soil', label: 'Mejorar el suelo', hint: 'Da más peso a la sucesión de cultivos.' },
]

/** Bloques B (cultivos y fechas) y C (agua y prioridad): un solo formulario. */
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
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      <option value="">No sé / no aplica</option>
      {crops.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  )

  return (
    <form onSubmit={submit}>
      <FormBlock letter="B" name="Cultivos y fechas">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Cultivo anterior">{cropSelect(form.previousCropId, (v) => set('previousCropId', v))}</Field>
          <Field label="Cultivo actual">{cropSelect(form.currentCropId, (v) => set('currentCropId', v))}</Field>
        </div>
        {/* PENDIENTE BACKEND: GET /api/crops no existe; la lista sale de mocks. */}
        <div className="flex flex-wrap items-center gap-3">
          <SourceBadge kind="prototype" label="Datos de ejemplo" />
          <span className="text-muted">La lista de cultivos todavía es de muestra.</span>
        </div>
        <Field label="Inicio previsto de la siguiente campaña">
          <input
            type="date"
            value={form.startOn}
            onChange={(e) => set('startOn', e.target.value)}
            className={`${inputClass} font-mono md:max-w-xs`}
          />
        </Field>
      </FormBlock>

      <FormBlock letter="C" name="Agua y prioridad">
        <Field label="Disponibilidad de agua">
          <select
            value={form.waterAvailability}
            onChange={(e) => set('waterAvailability', e.target.value as WaterAvailability | '')}
            className={`${inputClass} md:max-w-md`}
          >
            <option value="">Sin indicar</option>
            {WATER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <fieldset className="border-0 p-0">
          <legend className="font-medium text-ink">¿Qué es más importante para ti?</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {PRIORITIES.map((p) => {
              const on = form.priority === p.value
              return (
                <label
                  key={p.value}
                  className={`block min-h-[88px] cursor-pointer border-2 bg-panel p-4 ${
                    on ? 'border-lima' : 'border-line hover:border-edge'
                  }`}
                >
                  <input
                    type="radio"
                    name="priority"
                    className="sr-only"
                    checked={on}
                    onChange={() => set('priority', p.value)}
                  />
                  <span className={`block font-display text-2xl font-extrabold tracking-[-0.02em] ${on ? 'text-lima' : 'text-ink'}`}>
                    {p.label}
                  </span>
                  <span className="mt-1 block text-muted">{p.hint}</span>
                </label>
              )
            })}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="lg">Guardar →</Button>
          {saved && (
            <>
              <span role="status" className="font-mono text-base text-lima">
                Guardado en este navegador.
              </span>
              <ButtonLink to="/rotaciones" variant="outline">
                Ver rotaciones →
              </ButtonLink>
            </>
          )}
        </div>
      </FormBlock>
    </form>
  )
}

/** 01 / Parcela */
export function PlotPage() {
  const { plot, loading, error, reload } = usePlot()
  const [adding, setAdding] = useState(false)

  if (loading) return <Loading label="Cargando tus parcelas…" />
  if (error) return <ErrorBox message={error} onRetry={reload} />

  return (
    <div>
      <PageHeader index="01" label="Parcela" title="Registra tu parcela" />

      {!plot ? (
        <FormBlock letter="A" name="Ubicación">
          <p className="text-muted">Aún no tienes parcelas. Registra la primera para empezar.</p>
          <NewPlotForm />
        </FormBlock>
      ) : (
        <>
          <FormBlock letter="A" name="Ubicación">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Eyebrow>Parcela registrada</Eyebrow>
                <p className="mt-1 font-display text-3xl font-extrabold leading-none tracking-[-0.02em]">
                  {plot.name}
                </p>
                <p className="mt-2 font-mono text-base text-muted">
                  {plot.latitude}°, {plot.longitude}°
                </p>
                {!adding && (
                  <Button variant="ghost" onClick={() => setAdding(true)} className="mt-3 !px-0">
                    + Registrar otra parcela
                  </Button>
                )}
              </div>
              <MapFrame lat={plot.latitude} lng={plot.longitude} />
            </div>
            {adding && (
              <div className="border-t border-line pt-5">
                <Eyebrow tone="lima" className="mb-4">
                  Nueva parcela
                </Eyebrow>
                <NewPlotForm onDone={() => setAdding(false)} />
              </div>
            )}
          </FormBlock>
          <PrefsForm />
        </>
      )}
    </div>
  )
}
