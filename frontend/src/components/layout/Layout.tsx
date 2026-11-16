import { Outlet } from 'react-router-dom'
import { Guide } from '../guide/Guide'
import { GuideDataProvider } from '../guide/data'
import { TopBar } from './TopBar'

export function Layout() {
  return (
    <GuideDataProvider>
      <div className="min-h-screen">
        <TopBar />
        {/* pb-44: deja espacio abajo para que la mascota de la Guía (abajo a la izquierda) no tape el final de la página */}
        <main className="mx-auto w-full max-w-[1200px] px-4 pb-44 pt-8 md:px-8 md:pt-12">
          <Outlet />
        </main>
      </div>
      <Guide />
    </GuideDataProvider>
  )
}
