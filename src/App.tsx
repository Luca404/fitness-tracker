import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { useData } from './contexts/DataContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import Toast from './components/common/Toast'

const MealsPage = lazy(() => import('./pages/MealsPage'))
const WorkoutPage = lazy(() => import('./pages/WorkoutPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const WeightPage = lazy(() => import('./pages/WeightPage'))
const KitchenPage = lazy(() => import('./pages/KitchenPage'))

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-primary-400 text-2xl" aria-label="Caricamento">⏳</div>
    </div>
  )
}

function AppRoutes() {
  const { user, loading: authLoading } = useAuth()
  const { profile, profileStatus, profileUserId, fetchProfile } = useData()

  if (authLoading || (user && (
    profileUserId !== user.id || profileStatus === 'idle' || profileStatus === 'loading'
  ))) {
    return <LoadingScreen />
  }

  if (!user) return <LoginPage />

  if (profileStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <p className="text-gray-300">Non è stato possibile caricare il profilo.</p>
          <button type="button" onClick={fetchProfile} className="btn-primary">Riprova</button>
        </div>
      </div>
    )
  }

  if (profileStatus === 'missing' || profile === null) return <OnboardingPage />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/meals" replace />} />
        <Route path="/meals" element={<MealsPage />} />
        <Route path="/workout" element={<WorkoutPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/weight" element={<WeightPage />} />
        <Route path="/kitchen" element={<KitchenPage />} />
        <Route path="/pantry" element={<Navigate to="/kitchen?tab=pantry" replace />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="*" element={<Navigate to="/meals" replace />} />
    </Routes>
  )
}

export default function App() {
  const { toast } = useData()
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <AppRoutes />
      </Suspense>
      {toast && <Toast message={toast} />}
    </BrowserRouter>
  )
}
