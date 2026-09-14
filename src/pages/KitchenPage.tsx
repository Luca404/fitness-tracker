import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import KitchenDishes from '../components/kitchen/KitchenDishes'

const PantryPage = lazy(() => import('./PantryPage'))

type KitchenTab = 'dishes' | 'pantry'

export default function KitchenPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: KitchenTab = searchParams.get('tab') === 'pantry' ? 'pantry' : 'dishes'

  function selectTab(nextTab: KitchenTab) {
    setSearchParams(nextTab === 'dishes' ? {} : { tab: 'pantry' }, { replace: true })
  }

  return (
    <div className="space-y-5 p-4 pb-24">
      <div className="rounded-3xl bg-gradient-to-br from-primary-500/20 via-gray-800 to-gray-800 p-5 ring-1 ring-primary-500/20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-400">La tua cucina</p>
        <h1 className="mt-1 text-2xl font-bold">Cucina</h1>
        <p className="mt-1 text-sm leading-relaxed text-gray-400">Organizza le ricette e scopri cosa puoi preparare con ciò che hai.</p>
      </div>

      <div className="grid grid-cols-2 rounded-2xl bg-gray-800/80 p-1 ring-1 ring-gray-700/70" role="tablist" aria-label="Sezioni Cucina">
        <button type="button" role="tab" aria-selected={tab === 'dishes'} onClick={() => selectTab('dishes')}
          className={`rounded-xl py-2.5 text-sm font-semibold transition ${tab === 'dishes' ? 'bg-primary-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>
          🍲 Piatti
        </button>
        <button type="button" role="tab" aria-selected={tab === 'pantry'} onClick={() => selectTab('pantry')}
          className={`rounded-xl py-2.5 text-sm font-semibold transition ${tab === 'pantry' ? 'bg-primary-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>
          🧺 Dispensa
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
