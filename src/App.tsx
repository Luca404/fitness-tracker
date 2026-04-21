import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { useData } from './contexts/DataContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import MealsPage from './pages/MealsPage'
import WorkoutPage from './pages/WorkoutPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import WeightPage from './pages/WeightPage'

function AppRoutes() {
  const { user, loading: authLoading } = useAuth()
  const { profile, fetchProfile } = useData()

  useEffect(() => {
    if (user) fetchProfile()
  }, [user, fetchProfile])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-primary-400 text-2xl" aria-label="Caricamento">⏳</div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  if (profile === null) return <OnboardingPage />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/meals" replace />} />
        <Route path="/meals" element={<MealsPage />} />
        <Route path="/workout" element={<WorkoutPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/weight" element={<WeightPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="*" element={<Navigate to="/meals" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
