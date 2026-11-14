import type { Campaign } from '../../types/api'
import { formatDay } from '../../utils/format'

export function CampaignCalendar({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <ol className="space-y-2">
      {campaigns.map((c, i) => (
        <li key={i} className="flex items-start gap-3 rounded-lg bg-stone-50 p-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-campo-800 font-bold text-white">
            {i + 1}
          </span>
          <div>
            <p className="font-semibold">{c.crop}</p>
            <p className="text-sm text-stone-700">
              Siembra: {formatDay(c.starts_on)} · Cosecha: {formatDay(c.ends_on)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
