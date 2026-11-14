import { Alert } from './Alert'
import { Button } from './Button'

interface Props {
  message: string
  onRetry?: () => void
}

export function ErrorBox({ message, onRetry }: Props) {
  return (
    <Alert tone="danger" title="Algo salió mal" role="alert">
      <p>{message}</p>
      {onRetry && (
        <Button variant="danger" onClick={onRetry} className="mt-3">
          Reintentar
        </Button>
      )}
    </Alert>
  )
}
