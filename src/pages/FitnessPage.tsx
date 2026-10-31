import { lazy, Suspense } from 'react'
import PageHeader from '../components/common/PageHeader'
import { Navigate, useSearchParams } from 'react-router-dom'

const WorkoutPage = lazy(() => import('./WorkoutPage'))
const GymProgressPage = lazy(() => import('./GymProgressPage'))

type FitnessTab = 'workout' | 'progress'

export default function FitnessPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: FitnessTab = searchParams.get('tab') === 'progress' ? 'progress' : 'workout'

  function selectTab(nextTab: FitnessTab) {
    const next = new URLSearchParams(searchParams)
    if (nextTab === 'workout') next.delete('tab')
    else next.set('tab', 'progress')
    setSearchParams(next, { replace: true })
  }

  if (searchParams.get('tab') === 'weight') return <Navigate to="/weight" replace />

  return (
    <div className="app-page fitness-page">
      <PageHeader title="Fitness" subtitle="Il movimento, al tuo ritmo." />
      <div className="section-tabs" role="tablist" aria-label="Sezioni Fitness">
        <button
          type="button"
          role="tab"
          id="fitness-workout-tab"
          aria-controls="fitness-panel"
          aria-selected={tab === 'workout'}
          onClick={() => selectTab('workout')}

        >
          Allenamenti
        </button>
        <button
          type="button"
          role="tab"
          id="fitness-progress-tab"
          aria-controls="fitness-panel"
          aria-selected={tab === 'progress'}
          onClick={() => selectTab('progress')}

        >
          Progressi
        </button>
      </div>

      <div id="fitness-panel" role="tabpanel" aria-labelledby={`fitness-${tab}-tab`}>
        <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-gray-800" />}>
          {tab === 'workout' ? <WorkoutPage embedded /> : <GymProgressPage />}
        </Suspense>
      </div>
    </div>
  )
}
