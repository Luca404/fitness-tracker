import PageHeader from '../components/common/PageHeader'
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
    <div className="app-page kitchen-page space-y-5">
      <PageHeader title="Cucina" subtitle="Ingredienti e piatti, a modo tuo." />
      <div className="section-tabs" role="tablist" aria-label="Sezioni Cucina">
        <button type="button" role="tab" aria-selected={tab === 'pantry'} onClick={() => selectTab('pantry')}
          >
          Ingredienti
        </button>
        <button type="button" role="tab" aria-selected={tab === 'dishes'} onClick={() => selectTab('dishes')}
          >
          Piatti
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
