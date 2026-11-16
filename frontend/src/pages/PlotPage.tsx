import { useEffect, useState, type FormEvent } from 'react'
import { LocationMap } from '../components/plot/LocationMap'
import { waterOptions } from '../components/plot/water'
import { Button, ButtonLink } from '../components/ui/Button'
import { ErrorBox } from '../components/ui/ErrorBox'
import { Eyebrow } from '../components/ui/Eyebrow'
import { FormBlock } from '../components/ui/FormBlock'
import { Loading } from '../components/ui/Loading'
import { PageHeader } from '../components/ui/PageHeader'
import { SourceBadge } from '../components/ui/SourceBadge'
import { inputClass } from '../components/ui/styles'
import { errorMessage } from '../hooks/useAsync'
import { USE_MOCKS } from '../services/api'
import { usePlot } from '../hooks/usePlot'
import { td } from '../i18n/dataText'
import { useLanguage } from '../i18n/LanguageContext'
import type { TKey } from '../i18n/translations'
import {
  cycleFormFrom,
  summarizeSave,
  syncCropCycles,
  waterPartLabel,
  type CycleForm,
  type PartResult,
} from '../services/cropCycles'
import type { Priority, WaterAvailability } from '../types/api'
import { cropName } from '../components/rotations/labels'

/** La prioridad de la parcela si es una de las dos que ofrece la interfaz; si no, '' (sin elegir). */
function uiPriority(p: string | null | undefined): Priority | '' {
  return p === 'save_water' || p === 'improve_soil' ? p : ''
}

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
  const { t } = useLanguage()
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
      return setError(t('plot.form.latError'))
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return setError(t('plot.form.lngError'))
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
    <form onSubmit={submit} className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="space-y-5">
        <Field label={t('plot.form.name')}>
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('plot.form.lat')}>
            <input
              required
              inputMode="decimal"
              placeholder={t('plot.form.latPlaceholder')}
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className={`${inputClass} font-mono`}
            />
          </Field>
          <Field label={t('plot.form.lng')}>
            <input
              required
              inputMode="decimal"
              placeholder={t('plot.form.lngPlaceholder')}
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className={`${inputClass} font-mono`}
            />
          </Field>
        </div>
        <p className="text-muted">{t('plot.form.hint')}</p>
        {error && <ErrorBox message={error} />}
        <Button size="lg" disabled={busy}>
          {busy ? t('plot.form.saving') : t('plot.form.save')}
        </Button>
      </div>
      <LocationMap
        lat={lat.trim() === '' ? null : lat}
        lng={lng.trim() === '' ? null : lng}
        onPick={(la, lo) => {
          setLat(la.toFixed(4))
          setLng(lo.toFixed(4))
        }}
      />
    </form>
  )
}

const PRIORITIES = [
  { value: 'save_water', labelKey: 'priority.save_water.label', hintKey: 'plot.priority.save_water.hint' },
  { value: 'improve_soil', labelKey: 'priority.improve_soil.label', hintKey: 'plot.priority.improve_soil.hint' },
] as const satisfies readonly { value: Priority; labelKey: TKey; hintKey: TKey }[]

/** Bloques B (cultivos y fechas) y C (agua y prioridad): un solo formulario. */
function PrefsForm() {
  const { plot, crops, cropsError, cycles, cyclesLoading, cyclesError, updatePlot, refreshPlot, reloadCycles } =
    usePlot()
  const { t } = useLanguage()
  // Cultivo anterior, cultivo actual y fecha de inicio: lo que dice la API (ciclos de cultivo).
  const [form, setForm] = useState<CycleForm>(() => cycleFormFrom(cycles))
  // Agua y prioridad: van en la parcela. '' = sin indicar (prioridad: la parcela tiene otra que la interfaz no ofrece).
  const [water, setWater] = useState<WaterAvailability | ''>(plot?.water_availability ?? '')
  const [priority, setPriority] = useState<Priority | ''>(uiPriority(plot?.priority))
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  // Lo que dice la API manda sobre el formulario: al cargar, al cambiar de parcela y tras guardar.
  useEffect(() => {
    setForm(cycleFormFrom(cycles))
  }, [cycles])
  useEffect(() => {
    setWater(plot?.water_availability ?? '')
    setPriority(uiPriority(plot?.priority))
  }, [plot?.id, plot?.priority, plot?.water_availability])
  useEffect(() => setResult(null), [plot?.id])

  const cyclesReady = cycles !== null
  const setField = <K extends keyof CycleForm>(k: K, v: CycleForm[K]) => {
    setResult(null)
    setForm((f) => ({ ...f, [k]: v }))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!plot) return
    setBusy(true)
    setResult(null)
    const parts: PartResult[] = []

    // Agua y prioridad: PATCH de la parcela, solo si cambiaron. null borra el agua; la prioridad solo se envía si se eligió.
    const waterChanged = water !== (plot.water_availability ?? '')
    const priorityChanged = priority !== '' && priority !== plot.priority
    if (waterChanged || priorityChanged) {
      try {
        await updatePlot({
          ...(waterChanged ? { water_availability: water || null } : {}),
          ...(priorityChanged ? { priority } : {}),
        })
        parts.push({ label: waterPartLabel(), ok: true })
      } catch (err) {
        parts.push({ label: waterPartLabel(), ok: false, message: errorMessage(err) })
      }
    }

    // Ciclos de cultivo: solo los campos que cambiaron.
    if (cycles) parts.push(...(await syncCropCycles(plot.id, cycles, form)))

    // Se vuelve a leer lo guardado para mostrar el estado real.
    await Promise.allSettled([refreshPlot(), reloadCycles()])
    setResult(summarizeSave(parts))
    setBusy(false)
  }

  const cropSelect = (value: string, onChange: (v: string) => void) => (
    <select
      value={crops.some((c) => c.id === value) ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={!cyclesReady || busy}
      className={inputClass}
    >
      <option value="">{t('plot.cropUnknown')}</option>
      {crops.map((c) => (
        <option key={c.id} value={c.id}>
          {cropName(c.id, crops)}
        </option>
      ))}
    </select>
  )

  return (
    <form onSubmit={(e) => void submit(e)}>
      <FormBlock letter="B" name={t('plot.blockB')}>
        {cyclesLoading && <Loading label={t('plot.cropsLoading')} />}
        {cyclesError && <ErrorBox message={t('plot.cropsLoadError', { error: cyclesError })} onRetry={() => void reloadCycles()} />}
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={t('plot.previousCrop')}>{cropSelect(form.previousCropId, (v) => setField('previousCropId', v))}</Field>
          <Field label={t('plot.currentCrop')}>{cropSelect(form.currentCropId, (v) => setField('currentCropId', v))}</Field>
        </div>
        {USE_MOCKS && (
          <div className="flex flex-wrap items-center gap-3">
            <SourceBadge kind="prototype" label={t('common.exampleData')} />
            <span className="text-muted">{t('plot.exampleMode')}</span>
          </div>
        )}
        {cropsError && <ErrorBox message={t('plot.cropListError', { error: cropsError })} />}
        <Field label={t('plot.startOn')}>
          <input
            type="date"
            value={form.startOn}
            onChange={(e) => setField('startOn', e.target.value)}
            disabled={!cyclesReady || busy}
            className={`${inputClass} font-mono md:max-w-xs`}
          />
        </Field>
      </FormBlock>

      <FormBlock letter="C" name={t('plot.blockC')}>
        <Field label={t('plot.waterAvailability')}>
          <select
            value={water}
            onChange={(e) => {
              setResult(null)
              setWater(e.target.value as WaterAvailability | '')
            }}
            disabled={busy}
            className={`${inputClass} md:max-w-md`}
          >
            <option value="">{t('common.notIndicated')}</option>
            {waterOptions().map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <fieldset className="border-0 p-0">
          <legend className="font-medium text-ink">{t('plot.whatMatters')}</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {PRIORITIES.map((p) => {
              const on = priority === p.value
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
                    onChange={() => {
                      setResult(null)
                      setPriority(p.value)
                    }}
                  />
                  <span className={`block font-display text-2xl font-extrabold tracking-[-0.02em] ${on ? 'text-lima' : 'text-ink'}`}>
                    {on && (
                      <span aria-hidden className="mr-2 font-mono text-lg">
                        ✓
                      </span>
                    )}
                    {t(p.labelKey)}
                  </span>
                  <span className="mt-1 block text-muted">{t(p.hintKey)}</span>
                </label>
              )
            })}
          </div>
          {priority === '' && (
            <p className="mt-2 text-muted">
              {t('plot.noPriority')}
              {plot?.priority ? ` ${t('plot.otherPriority', { priority: plot.priority })}` : ''}
            </p>
          )}
        </fieldset>
        {result && !result.ok && <ErrorBox message={result.text} />}
        <div className="flex flex-wrap items-center gap-4">
          <Button size="lg" disabled={busy}>
            {busy ? t('plot.form.saving') : t('plot.save')}
          </Button>
          {result?.ok && (
            <>
              <span role="status" className="font-mono text-base text-lima">
                {result.text}
              </span>
              <ButtonLink to="/rotaciones" variant="outline">
                {t('plot.seeRotations')}
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
  const { t } = useLanguage()

  if (loading) return <Loading label={t('plot.loadingPlots')} />
  if (error) return <ErrorBox message={error} onRetry={reload} />

  return (
    <div>
      <PageHeader index="01" label={t('nav.plot')} title={t('plot.title')} />

      {!plot ? (
        <FormBlock letter="A" name={t('plot.blockA')}>
          <p className="text-muted">{t('plot.noPlots')}</p>
          <NewPlotForm />
        </FormBlock>
      ) : (
        <>
          <FormBlock letter="A" name={t('plot.blockA')}>
            <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <div>
                <Eyebrow>{t('plot.registered')}</Eyebrow>
                <p className="mt-1 font-display text-3xl font-extrabold leading-none tracking-[-0.02em]">
                  {td(plot.name)}
                </p>
                <p className="mt-2 font-mono text-base text-muted">
                  {plot.latitude}°, {plot.longitude}°
                </p>
                {!adding && (
                  <Button variant="ghost" onClick={() => setAdding(true)} className="mt-3 !px-0">
                    {t('plot.addAnother')}
                  </Button>
                )}
              </div>
              <LocationMap lat={plot.latitude} lng={plot.longitude} />
            </div>
            {adding && (
              <div className="border-t border-line pt-5">
                <Eyebrow tone="lima" className="mb-4">
                  {t('plot.newPlot')}
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
