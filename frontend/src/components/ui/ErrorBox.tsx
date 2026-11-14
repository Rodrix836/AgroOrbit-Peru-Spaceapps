interface Props {
  message: string
  onRetry?: () => void
}

export function ErrorBox({ message, onRetry }: Props) {
  return (
    <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900">
      <p className="font-semibold">Algo salió mal</p>
      <p className="mt-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-lg bg-red-700 px-4 py-2 font-medium text-white hover:bg-red-800"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
