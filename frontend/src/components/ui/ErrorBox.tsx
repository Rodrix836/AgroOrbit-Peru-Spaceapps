import { Alert } from './Alert'
import { Button } from './Button'

interface Props {
  message: string
  onRetry?: () => void
}

export function ErrorBox({ message, onRetry }: Props) {
  return (
    <Alert tone="danger" title="Error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-3">
          Reintentar
        </Button>
      )}
    </Alert>
  )
}
