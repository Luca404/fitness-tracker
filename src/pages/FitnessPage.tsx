import { lazy, Suspense } from 'react'
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
    <div className="space-y-5 p-4 pb-24">
      <div className="grid grid-cols-2 rounded-2xl bg-gray-800/80 p-1 ring-1 ring-gray-700/70" role="tablist" aria-label="Sezioni Fitness">
        <button
          type="button"
          role="tab"
          id="fitness-workout-tab"
          aria-controls="fitness-panel"
          aria-selected={tab === 'workout'}
          onClick={() => selectTab('workout')}
          className={`rounded-xl py-2.5 text-sm font-semibold transition ${tab === 'workout' ? 'bg-primary-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
        >
          💪 Allenamenti
        </button>
        <button
          type="button"
          role="tab"
          id="fitness-progress-tab"
          aria-controls="fitness-panel"
          aria-selected={tab === 'progress'}
          onClick={() => selectTab('progress')}
          className={`rounded-xl py-2.5 text-sm font-semibold transition ${tab === 'progress' ? 'bg-primary-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
        >
          📈 Progressi
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
