import { useLanguage } from '../../i18n/LanguageContext'
import { labelClass, TONES, type Tone } from './styles'

const LABEL_KEYS = {
  sensor: 'common.sensorEsp32',
  nasa: 'common.nasaPower',
  prototype: 'common.prototype',
} as const

/** Insignia de fuente: de dónde sale cada dato. */
export function SourceBadge({ kind, label }: { kind: Tone; label?: string }) {
  const { t } = useLanguage()
  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 ${labelClass} ${TONES[kind].text} ${TONES[kind].border}`}
    >
      {label ?? t(LABEL_KEYS[kind])}
    </span>
  )
}
