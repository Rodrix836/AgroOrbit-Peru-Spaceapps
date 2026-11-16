// Guardado del formulario de ciclos de cultivo: cultivo anterior (finished), cultivo actual (active)
// y inicio de la próxima campaña (planned). Contrato: backend/docs/api-contract.md, "Ciclos de cultivo".
import type { CropCycle, CropCycleCreate, CropCyclesResponse } from '../types/api'
import { api } from './api'
import { ApiError } from './apiError'
import { tr } from '../i18n/active'

/** Valores del formulario ('' = sin elegir / sin fecha). */
export interface CycleForm {
  previousCropId: string
  currentCropId: string
  startOn: string
}

export const EMPTY_CYCLE_FORM: CycleForm = { previousCropId: '', currentCropId: '', startOn: '' }

/** Lo que dice la API: previous.crop_code, current.crop_code y planned.sowing_date. */
export function cycleFormFrom(c: CropCyclesResponse | null): CycleForm {
  if (!c) return EMPTY_CYCLE_FORM
  return {
    previousCropId: c.previous?.crop_code ?? '',
    currentCropId: c.current?.crop_code ?? '',
    startOn: c.planned?.sowing_date ?? '',
  }
}

/** Una parte del guardado (agua y prioridad, o uno de los tres campos de ciclos). */
export interface PartResult {
  label: string
  ok: boolean
  /** Solo si falló. */
  message?: string
}

/** Qué parte se guardó, en el idioma activo («el agua y la prioridad» / «the water and priority»). */
const LABEL = {
  get water() {
    return tr('cycle.part.water')
  },
  get current() {
    return tr('cycle.part.current')
  },
  get previous() {
    return tr('cycle.part.previous')
  },
  get start() {
    return tr('cycle.part.start')
  },
}
export const waterPartLabel = (): string => LABEL.water

const FIELD_LABELS: Record<string, string> = {
  get crop_code() {
    return tr('cycle.field.crop')
  },
  get sowing_date() {
    return tr('cycle.field.start')
  },
  get harvest_date() {
    return tr('cycle.field.harvest')
  },
  get status() {
    return tr('cycle.field.status')
  },
}

/** Con 422 muestra el mensaje del campo que indica details[].field; en otro caso, el mensaje de la API. */
export function cycleErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'validation_error' && Array.isArray(e.details) && e.details.length > 0) {
      const d = e.details[0] as { field?: unknown; message?: unknown }
      const key = typeof d.field === 'string' ? (d.field.split('.').pop() ?? '') : ''
      const text = typeof d.message === 'string' ? d.message : ''
      if (text) return FIELD_LABELS[key] ? `${FIELD_LABELS[key]}: ${text}` : text
    }
    return e.message
  }
  return e instanceof Error ? e.message : tr('common.unexpectedError')
}

/** Con 409 (active_cycle_exists / planned_cycle_exists), el id del ciclo que ya existe. */
function conflictCycleId(e: unknown): string | null {
  if (!(e instanceof ApiError) || e.status !== 409) return null
  if (e.code !== 'active_cycle_exists' && e.code !== 'planned_cycle_exists') return null
  const id = (e.details as { cycle_id?: unknown } | null)?.cycle_id
  return typeof id === 'string' ? id : null
}

/**
 * Aplica un campo: POST si el ciclo no existe, PATCH si existe, DELETE si se vació.
 * Devuelve false si no había nada que cambiar. Si el POST responde 409, repite como PATCH sobre details.cycle_id.
 */
async function applyField(
  plotId: string,
  existing: CropCycle | null,
  status: CropCycleCreate['status'],
  field: 'crop_code' | 'sowing_date',
  desired: string,
): Promise<boolean> {
  const saved = existing ? (existing[field] ?? '') : ''
  if (desired === saved) return false
  const patch = field === 'crop_code' ? { crop_code: desired } : { sowing_date: desired }

  if (existing) {
    if (desired === '') await api.deleteCropCycle(plotId, existing.id)
    else await api.updateCropCycle(plotId, existing.id, patch)
    return true
  }
  try {
    await api.createCropCycle(plotId, { status, ...patch })
  } catch (e) {
    const cycleId = conflictCycleId(e)
    if (!cycleId) throw e
    await api.updateCropCycle(plotId, cycleId, patch)
  }
  return true
}

/**
 * Guarda solo lo que cambió respecto a `loaded` (lo último leído de la API).
 * Cada campo es independiente: devuelve un resultado por campo cambiado, sin lanzar.
 */
export async function syncCropCycles(
  plotId: string,
  loaded: CropCyclesResponse,
  form: CycleForm,
): Promise<PartResult[]> {
  const steps = [
    { label: LABEL.current, run: () => applyField(plotId, loaded.current, 'active', 'crop_code', form.currentCropId) },
    { label: LABEL.previous, run: () => applyField(plotId, loaded.previous, 'finished', 'crop_code', form.previousCropId) },
    { label: LABEL.start, run: () => applyField(plotId, loaded.planned, 'planned', 'sowing_date', form.startOn) },
  ]
  const results: PartResult[] = []
  for (const step of steps) {
    try {
      if (await step.run()) results.push({ label: step.label, ok: true })
    } catch (e) {
      results.push({ label: step.label, ok: false, message: cycleErrorMessage(e) })
    }
  }
  return results
}

const joinY = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} ${tr('cycle.and')} ${items[items.length - 1]}`

const endWithDot = (s: string) => (s.endsWith('.') ? s : `${s}.`)

/** Mensaje final: éxito, sin cambios, o qué parte se guardó y cuál no (con el mensaje de la API). */
export function summarizeSave(results: PartResult[]): { ok: boolean; text: string } {
  if (results.length === 0) return { ok: true, text: tr('cycle.sum.none') }
  const failed = results.filter((r) => !r.ok)
  const saved = results.filter((r) => r.ok)
  if (failed.length === 0) return { ok: true, text: tr('cycle.sum.ok') }
  const msg = (f: PartResult) => f.message ?? ''
  if (saved.length === 0) {
    return {
      ok: false,
      text: endWithDot(
        failed
          .map((f, i) =>
            i === 0
              ? tr('cycle.sum.failFirst', { label: f.label, msg: msg(f) })
              : tr('cycle.sum.failNext', { label: f.label, msg: msg(f) }),
          )
          .join('; '),
      ),
    }
  }
  return {
    ok: false,
    text: endWithDot(
      tr('cycle.sum.partial', {
        saved: joinY(saved.map((x) => x.label)),
        fails: failed
          .map((f, i) =>
            i === 0
              ? tr('cycle.sum.partialFirst', { label: f.label, msg: msg(f) })
              : tr('cycle.sum.failNext', { label: f.label, msg: msg(f) }),
          )
          .join('; '),
      }),
    ),
  }
}
