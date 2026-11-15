import { useEffect, useState } from 'react'

/** Hora actual (ms) que se actualiza sola cada `intervalMs`, para que «hace 12 s» avance sin recargar. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
