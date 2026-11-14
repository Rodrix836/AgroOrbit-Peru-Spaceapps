import type { Campaign } from '../../types/api'
import { formatDay } from '../../utils/format'

export function CampaignCalendar({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <ol className="space-y-2">
      {campaigns.map((c, i) => (
        <li key={i} className="flex items-start gap-3 rounded-xl bg-brand-50 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-800 font-bold text-white">
            {i + 1}
          </span>
          <div>
            <p className="font-bold text-brand-900">{c.crop}</p>
            <p className="text-muted">
              Siembra: {formatDay(c.starts_on)} · Cosecha: {formatDay(c.ends_on)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
