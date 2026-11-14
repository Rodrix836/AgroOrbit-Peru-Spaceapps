import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

const icon = (d: ReactNode) => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {d}
  </svg>
)

const LINKS: { to: string; label: string; icon: ReactNode }[] = [
  {
    to: '/parcela',
    label: 'Mi parcela',
    icon: icon(
      <>
        <path d="M12 21V11" />
        <path d="M12 11c0-4 3-6 7-6 0 4-3 6-7 6Z" />
        <path d="M12 14c0-3-2-5-6-5 0 3 2 5 6 5Z" />
      </>,
    ),
  },
  {
    to: '/panel',
    label: 'Datos',
    icon: icon(
      <>
        <path d="M4 20V10" />
        <path d="M10 20V4" />
        <path d="M16 20v-7" />
        <path d="M22 20H2" />
      </>,
    ),
  },
  {
    to: '/rotaciones',
    label: 'Rotaciones',
    icon: icon(
      <>
        <path d="M21 12a9 9 0 0 0-15-6.7L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 15 6.7L21 16" />
        <path d="M21 21v-5h-5" />
      </>,
    ),
  },
]

/** Barra lateral verde en escritorio; menú inferior en celular. */
export function Sidebar() {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-brand-700 bg-brand-900 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:flex-col md:gap-2 md:border-t-0 md:p-4"
    >
      <div className="hidden px-3 pb-4 pt-2 md:block">
        <p className="text-2xl font-extrabold tracking-tight text-white">AgroOrbit</p>
        <p className="text-brand-100">Rotación de cultivos con datos NASA</p>
      </div>
      {LINKS.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center gap-1 px-2 py-2.5 font-semibold md:flex-none md:flex-row md:justify-start md:gap-3 md:rounded-xl md:px-3 md:py-3 md:text-lg ${
              isActive ? 'bg-brand-700 text-white' : 'text-brand-100 hover:bg-brand-800 hover:text-white'
            }`
          }
        >
          {l.icon}
          {l.label}
        </NavLink>
      ))}
    </nav>
  )
}
