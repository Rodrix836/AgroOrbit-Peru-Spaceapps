import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/parcela', label: 'Mi parcela', icon: '🌱' },
  { to: '/panel', label: 'Datos', icon: '📊' },
  { to: '/rotaciones', label: 'Rotaciones', icon: '🔄' },
]

/** Barra lateral en pantallas grandes; barra inferior en celular. */
export function Sidebar() {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-stone-300 bg-white md:static md:w-56 md:flex-col md:gap-1 md:border-t-0 md:border-r md:p-3"
    >
      {LINKS.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 px-2 py-2 text-sm font-semibold md:flex-none md:flex-row md:gap-3 md:rounded-lg md:px-3 md:py-3 md:text-base ${
              isActive
                ? 'bg-campo-100 text-campo-900'
                : 'text-stone-700 hover:bg-stone-100'
            }`
          }
        >
          <span aria-hidden className="text-xl">
            {l.icon}
          </span>
          {l.label}
        </NavLink>
      ))}
    </nav>
  )
}
