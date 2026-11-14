/**
 * Eje Y con marcas enteras ("redondas"): 25, 26, 27… en vez de 25.2, 26.1…
 * Devuelve el dominio y las marcas (máximo unas 6). `fromZero` fija el mínimo en 0.
 */
export function integerAxis(values: number[], fromZero = false): { domain: [number, number]; ticks: number[] } {
  const lo = fromZero ? 0 : Math.floor(Math.min(...values))
  let hi = Math.ceil(Math.max(...values))
  if (hi <= lo) hi = lo + 1
  const step = Math.max(1, Math.ceil((hi - lo) / 5))
  hi = lo + Math.ceil((hi - lo) / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi; v += step) ticks.push(v)
  return { domain: [lo, hi], ticks }
}
