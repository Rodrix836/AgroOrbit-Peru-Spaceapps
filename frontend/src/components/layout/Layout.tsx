import { Outlet } from 'react-router-dom'
import { Guide } from '../guide/Guide'
import { GuideDataProvider } from '../guide/data'
import { TopBar } from './TopBar'

export function Layout() {
  return (
    <GuideDataProvider>
      <div className="min-h-screen">
        <TopBar />
        {/* pb-28: deja espacio abajo para que el botón flotante de la Guía no tape el final de la página */}
        <main className="mx-auto w-full max-w-[1200px] px-4 pb-28 pt-8 md:px-8 md:pt-12">
          <Outlet />
        </main>
      </div>
      <Guide />
    </GuideDataProvider>
  )
}
