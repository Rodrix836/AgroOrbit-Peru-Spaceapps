import { useLanguage } from '../../i18n/LanguageContext'
import { PERIODS, type Period } from '../../utils/period'
import { Button } from '../ui/Button'
import { Eyebrow } from '../ui/Eyebrow'

/** Selector de período de NASA POWER: 90 días (por defecto), 1 año o 2 años. */
export function NasaPeriodSelector({
  value,
  onChange,
  disabled,
}: {
  value: Period
  onChange: (p: Period) => void
  disabled?: boolean
}) {
  const { t } = useLanguage()
  return (
    <div role="group" aria-label={t('period.groupLabel')} className="flex flex-wrap items-center gap-2">
      <Eyebrow tone="cielo" className="mr-1">
        {t('period.show')}
      </Eyebrow>
      {PERIODS.map((p) => (
        <Button
          key={p.id}
          variant={value.id === p.id ? 'cielo' : 'outline'}
          aria-pressed={value.id === p.id}
          disabled={disabled}
          onClick={() => onChange(p)}
        >
          {p.short}
        </Button>
      ))}
    </div>
  )
}
