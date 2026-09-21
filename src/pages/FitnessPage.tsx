import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'

const WorkoutPage = lazy(() => import('./WorkoutPage'))
const WeightPage = lazy(() => import('./WeightPage'))

type FitnessTab = 'workout' | 'weight'

export default function FitnessPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: FitnessTab = searchParams.get('tab') === 'weight' ? 'weight' : 'workout'

  function selectTab(nextTab: FitnessTab) {
    setSearchParams(nextTab === 'workout' ? {} : { tab: 'weight' }, { replace: true })
  }

  return (
    <div className="space-y-5 p-4 pb-24">
      <div className="grid grid-cols-2 rounded-2xl bg-gray-800/80 p-1 ring-1 ring-gray-700/70" role="tablist" aria-label="Sezioni Fitness">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'workout'}
          onClick={() => selectTab('workout')}
          className={`rounded-xl py-2.5 text-sm font-semibold transition ${tab === 'workout' ? 'bg-primary-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
        >
          💪 Allenamenti
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'weight'}
          onClick={() => selectTab('weight')}
          className={`rounded-xl py-2.5 text-sm font-semibold transition ${tab === 'weight' ? 'bg-primary-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
        >
          ⚖️ Peso
        </button>
      </div>

      <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-gray-800" />}>
        {tab === 'workout' ? <WorkoutPage embedded /> : <WeightPage embedded />}
      </Suspense>
    </div>
  )
}
