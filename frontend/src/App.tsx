import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Loading } from './components/ui/Loading'
import { useAuth } from './hooks/useAuth'
import { PlotProvider } from './hooks/usePlot'
import { useLanguage } from './i18n/LanguageContext'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { PlotPage } from './pages/PlotPage'
import { RotationsPage } from './pages/RotationsPage'

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const { t } = useLanguage()
  if (loading) return <Loading label={t('common.verifyingSession')} />
  if (!user) return <Navigate to="/login" replace />
  return <PlotProvider>{children}</PlotProvider>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/parcela" element={<PlotPage />} />
        <Route path="/panel" element={<DashboardPage />} />
        <Route path="/rotaciones" element={<RotationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/parcela" replace />} />
    </Routes>
  )
}
