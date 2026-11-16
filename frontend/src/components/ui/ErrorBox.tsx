import { useLanguage } from '../../i18n/LanguageContext'
import { Alert } from './Alert'
import { Button } from './Button'

interface Props {
  message: string
  onRetry?: () => void
}

export function ErrorBox({ message, onRetry }: Props) {
  const { t } = useLanguage()
  return (
    <Alert tone="danger" title={t('common.error')} role="alert">
      <p>{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-3">
          {t('common.retry')}
        </Button>
      )}
    </Alert>
  )
}
