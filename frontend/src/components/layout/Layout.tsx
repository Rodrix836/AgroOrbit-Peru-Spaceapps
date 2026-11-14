import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'

export function Layout() {
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto w-full max-w-[1200px] px-4 pb-20 pt-8 md:px-8 md:pt-12">
        <Outlet />
      </main>
    </div>
  )
}
