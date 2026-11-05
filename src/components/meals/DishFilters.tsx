import { useEffect, useId, useRef } from 'react'
import { dishCategoriesForMeal } from '../../data/dishCategories'
import type { DishCategoryFilter } from '../../data/dishCategories'
import type { DishMealType } from '../../types'

export default function DishFilters({ query, onQueryChange, category, onCategoryChange, mealType }: {
  query: string
  onQueryChange: (query: string) => void
  category: DishCategoryFilter
  onCategoryChange: (category: DishCategoryFilter) => void
  mealType?: DishMealType
}) {
  const id = useId()
  const categoryRow = useRef<HTMLDivElement>(null)
  useEffect(() => { if (categoryRow.current) categoryRow.current.scrollLeft = 0 }, [mealType])
  const options = [
    { id: 'all' as const, label: 'Tutti' },
    ...dishCategoriesForMeal(mealType),
    { id: 'uncategorized' as const, label: 'Senza categoria' },
  ]
  return <div className="mb-3 min-w-0 space-y-3">
    <label htmlFor={`${id}-search`} className="sr-only">Cerca un piatto</label>
    <div className="relative">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500"><circle cx="10.5" cy="10.5" r="6.5" /><path strokeLinecap="round" d="m16 16 4 4" /></svg>
      <input id={`${id}-search`} type="search" value={query} onChange={event => onQueryChange(event.target.value)}
        placeholder="Cerca un piatto..." autoComplete="off" className="input-field min-h-12 pl-10 text-sm" />
    </div>
    <div ref={categoryRow} role="group" aria-label="Tipo di piatto" className="-mx-1 flex gap-2 overflow-x-auto p-1">
      {options.map(option => <button key={option.id} type="button" aria-pressed={category === option.id}
        onClick={() => onCategoryChange(option.id)}
        className={`min-h-11 shrink-0 rounded-full px-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 ${category === option.id ? 'bg-primary-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}>
        {option.label}
      </button>)}
    </div>
  </div>
}
