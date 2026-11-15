import type { Campaign } from '../../types/api'
import { formatDay } from '../../utils/format'

function parse(day: string) {
  const [y, m, d] = day.split('-').map(Number)
  return { y, m, d }
}

const clamp = (n: number) => Math.max(0, Math.min(100, n))

/**
 * Calendario de 12 meses (01 a 12) que empieza en el mes de la primera siembra.
 * Primera campaña: barra lima sólida. Siguientes: barra con solo borde lima.
 * Los 12 meses caben siempre en el ancho de la tarjeta (sin desplazamiento horizontal).
 */
export function CampaignCalendar({ campaigns, showList = true }: { campaigns: Campaign[]; showList?: boolean }) {
  if (campaigns.length === 0) return null
  const startIdx = (day: string) => {
    const p = parse(day)
    return p.y * 12 + p.m - 1
  }
  const base = Math.min(...campaigns.map((c) => startIdx(c.starts_on)))

  /** Posición en meses (0 a 12) de un día dentro de la ventana. */
  const pos = (day: string, endOfDay = false) => {
    const p = parse(day)
    const dim = new Date(p.y, p.m, 0).getDate()
    return startIdx(day) - base + (p.d - 1 + (endOfDay ? 1 : 0)) / dim
  }

  const months = Array.from({ length: 12 }, (_, i) => {
    const idx = base + i
    return { n: String((idx % 12) + 1).padStart(2, '0'), year: Math.floor(idx / 12), first: i === 0 || idx % 12 === 0 }
  })

  return (
    <div>
      <div role="group" aria-label="Calendario de 12 meses">
        <div>
          <div className="grid grid-cols-12 border-b border-line">
            {months.map((m, i) => (
              <div
                key={i}
                className="min-w-0 border-l border-line px-0.5 pb-1 text-center font-mono text-[13px] leading-4 text-muted first:border-l-0 md:px-1 md:text-left"
              >
                <span className="block text-ink">{m.n}</span>
                <span className="block h-4 whitespace-nowrap tracking-[-0.1em] md:tracking-normal">
                  {m.first ? `’${String(m.year).slice(2)}` : ''}
                </span>
              </div>
            ))}
          </div>
          {campaigns.map((c, i) => {
            const left = clamp((pos(c.starts_on) / 12) * 100)
            const right = clamp((pos(c.ends_on, true) / 12) * 100)
            const width = Math.max(right - left, 2)
            // Barra angosta (menos de ~3,5 meses): el nombre va fuera de la barra para que se lea completo, también en celular.
            const narrow = width < 29
            return (
              <div
                key={i}
                className="relative h-12 border-b border-line"
                style={{
                  backgroundImage: 'linear-gradient(90deg, #25332b 1px, transparent 1px)',
                  backgroundSize: 'calc(100% / 12) 100%',
                }}
              >
                <div
                  title={`${c.crop}: ${formatDay(c.starts_on)} a ${formatDay(c.ends_on)}`}
                  className={`absolute top-1.5 flex h-9 items-center overflow-hidden whitespace-nowrap px-2 text-sm font-semibold ${
                    i === 0 ? 'bg-lima text-bg' : 'border border-lima bg-bg text-lima'
                  }`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                >
                  {!narrow && <span className="min-w-0 truncate">{c.crop}</span>}
                </div>
                {narrow && (
                  <span
                    className="absolute top-1.5 flex h-9 items-center whitespace-nowrap px-2 text-sm font-semibold text-lima"
                    style={left > 50 ? { right: `${100 - left}%` } : { left: `${left + width}%` }}
                  >
                    {c.crop}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
      {showList && (
        <ol className="mt-3 space-y-1">
          {campaigns.map((c, i) => (
            <li key={i} className="font-mono text-base text-ink">
              <span className="text-lima">{String(i + 1).padStart(2, '0')}</span> {c.crop} · siembra{' '}
              {formatDay(c.starts_on)} · cosecha {formatDay(c.ends_on)}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
