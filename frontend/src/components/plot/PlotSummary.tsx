import { usePlot } from '../../hooks/usePlot'
import { td } from '../../i18n/dataText'
import { useLanguage } from '../../i18n/LanguageContext'
import { cropName } from '../rotations/labels'
import { Eyebrow } from '../ui/Eyebrow'
import { WATER_LABELS } from './water'

/** Bloque mono con nombre, coordenadas, cultivo y riego de la parcela. */
export function PlotSummary() {
  const { plot, crops, cycles, cyclesLoading, cyclesError } = usePlot()
  const { t } = useLanguage()
  if (!plot) return null
  // Cultivo actual: el ciclo `active` que guarda la API.
  const code = cycles?.current?.crop_code
  const crop = code
    ? cropName(code, crops)
    : cyclesLoading
      ? t('common.loading')
      : cyclesError
        ? t('common.couldNotLoad')
        : t('common.noEntry')

  return (
    <div className="min-w-0 border-l border-edge pl-5 font-mono text-base leading-7">
      <Eyebrow tone="lima">{t('plotSummary.plot')}</Eyebrow>
      <p className="font-medium text-ink">{td(plot.name)}</p>
      <p className="text-muted">
        {plot.latitude}°, {plot.longitude}°
      </p>
      <p className="text-ink">{t('plotSummary.crop', { crop })}</p>
      <p className="text-ink">
        {t('plotSummary.water', {
          water: plot.water_availability ? WATER_LABELS[plot.water_availability] : t('common.notIndicated'),
        })}
      </p>
    </div>
  )
}
