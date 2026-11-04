import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { useData } from './contexts/DataContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import { PASSWORD_RECOVERY_PATH } from './utils/auth'
import OnboardingPage from './pages/OnboardingPage'
import Toast from './components/common/Toast'
import PageLoading from './components/common/PageLoading'
import { FitnessPointsProvider } from './contexts/FitnessPointsContext'

const MealsPage = lazy(() => import('./pages/MealsPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const KitchenPage = lazy(() => import('./pages/KitchenPage'))
const FitnessPage = lazy(() => import('./pages/FitnessPage'))
const GymSessionPage = lazy(() => import('./pages/GymSessionPage'))
const WellbeingPage = lazy(() => import('./pages/WellbeingPage'))
const WeightPage = lazy(() => import('./pages/WeightPage'))
const TutorialPage = lazy(() => import('./pages/TutorialPage'))
const PointsPage = lazy(() => import('./pages/PointsPage'))

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <PageLoading />
    </div>
  )
}

function TutorialLauncher({ onStart }: { onStart: (returnToSettings: boolean) => void }) {
  const { search } = useLocation()
  useEffect(() => { onStart(new URLSearchParams(search).get('from') === 'settings') }, [search, onStart])
  return <LoadingScreen />
}

function AppRoutes({ onStartTutorial }: { onStartTutorial: (returnToSettings: boolean) => void }) {
  const { user, loading: authLoading, isPasswordRecovery } = useAuth()
  const { profile, profileStatus, profileUserId, fetchProfile } = useData()
  const location = useLocation()

  if (authLoading) return <LoadingScreen />

  // A recovery session is authenticated, but must reach password reset before profile/onboarding.
  if (isPasswordRecovery || location.pathname === PASSWORD_RECOVERY_PATH) return <ResetPasswordPage />

  if (user && (
    profileUserId !== user.id || profileStatus === 'idle' || profileStatus === 'loading'
  )) {
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

  if (profile.tutorial_seen === false && location.pathname !== '/tutorial') {
    return <Navigate to="/tutorial" replace />
  }

  return (
    <Routes>
      <Route element={<FitnessPointsProvider><Layout /></FitnessPointsProvider>}>
        <Route index element={<Navigate to="/meals" replace />} />
        <Route path="/meals" element={<MealsPage />} />
        <Route path="/fitness" element={<FitnessPage />} />
        <Route path="/meals/wellbeing" element={<WellbeingPage />} />
        <Route path="/wellbeing" element={<Navigate to="/meals/wellbeing" replace />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/workout" element={<Navigate to="/fitness" replace />} />
        <Route path="/weight" element={<WeightPage />} />
        <Route path="/kitchen" element={<KitchenPage />} />
        <Route path="/pantry" element={<Navigate to="/kitchen?tab=pantry" replace />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/points" element={<PointsPage />} />
      </Route>
      <Route path="/fitness/session/:sessionId" element={<GymSessionPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/tutorial" element={<TutorialLauncher onStart={onStartTutorial} />} />
      <Route path="*" element={<Navigate to="/meals" replace />} />
    </Routes>
  )
}

export default function App() {
  const { toast, dismissTutorial, profileStatus, profileUserId } = useData()
  const { user, loading, isPasswordRecovery } = useAuth()
  const [tutorial, setTutorial] = useState<{ userId: string; returnTo: string } | null>(null)
  const startTutorial = useCallback((returnToSettings: boolean) => {
    if (user) setTutorial({ userId: user.id, returnTo: returnToSettings ? '/settings' : '/meals' })
  }, [user])
  const finishTutorial = useCallback(() => {
    void dismissTutorial()
    if (window.location.pathname === '/tutorial') {
      window.history.replaceState(window.history.state, '', tutorial?.returnTo ?? '/meals')
    }
    setTutorial(null)
  }, [dismissTutorial, tutorial])
  const tutorialActive = tutorial !== null && tutorial.userId === user?.id && !loading && !isPasswordRecovery
    && window.location.pathname !== PASSWORD_RECOVERY_PATH && profileStatus === 'ready' && profileUserId === user?.id

  return (
    <>
      <Suspense fallback={<LoadingScreen />}>
        {tutorialActive ? <TutorialPage key={tutorial.userId} onFinish={finishTutorial} /> : (
          <BrowserRouter><AppRoutes onStartTutorial={startTutorial} /></BrowserRouter>
        )}
      </Suspense>
      {toast && <Toast message={toast} />}
    </>
  )
}
