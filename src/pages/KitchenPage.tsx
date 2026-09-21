import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import KitchenDishes from '../components/kitchen/KitchenDishes'

const PantryPage = lazy(() => import('./PantryPage'))

type KitchenTab = 'dishes' | 'pantry'

export default function KitchenPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: KitchenTab = searchParams.get('tab') === 'dishes' ? 'dishes' : 'pantry'

  function selectTab(nextTab: KitchenTab) {
    setSearchParams(nextTab === 'pantry' ? {} : { tab: 'dishes' }, { replace: true })
  }

  return (
    <div className="space-y-5 p-4 pb-24">
      <div className="grid grid-cols-2 rounded-2xl bg-gray-800/80 p-1 ring-1 ring-gray-700/70" role="tablist" aria-label="Sezioni Cucina">
        <button type="button" role="tab" aria-selected={tab === 'pantry'} onClick={() => selectTab('pantry')}
          className={`rounded-xl py-2.5 text-sm font-semibold transition ${tab === 'pantry' ? 'bg-primary-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>
          🧺 Dispensa
        </button>
        <button type="button" role="tab" aria-selected={tab === 'dishes'} onClick={() => selectTab('dishes')}
          className={`rounded-xl py-2.5 text-sm font-semibold transition ${tab === 'dishes' ? 'bg-primary-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>
          🍲 Piatti
        </button>
      </div>

      {tab === 'dishes' ? <KitchenDishes /> : (
        <Suspense fallback={<div className="h-32 animate-pulse rounded-2xl bg-gray-800" />}>
          <PantryPage embedded />
        </Suspense>
      )}
    </div>
  )
}
