import { useId } from 'react'
import { DISH_CATEGORIES } from '../../data/dishCategories'
import type { DishCategoryFilter } from '../../data/dishCategories'

export default function DishFilters({ query, onQueryChange, category, onCategoryChange }: {
  query: string
  onQueryChange: (query: string) => void
  category: DishCategoryFilter
  onCategoryChange: (category: DishCategoryFilter) => void
}) {
  const id = useId()
  return <div className="mb-3 flex min-w-0 gap-2">
    <label htmlFor={`${id}-search`} className="sr-only">Cerca un piatto</label>
    <input id={`${id}-search`} type="search" value={query} onChange={event => onQueryChange(event.target.value)}
      placeholder="Cerca un piatto..." autoComplete="off" className="input-field min-h-12 min-w-0 flex-1 text-sm" />
    <label htmlFor={`${id}-category`} className="sr-only">Tipo di piatto</label>
    <select id={`${id}-category`} value={category} onChange={event => onCategoryChange(event.target.value as DishCategoryFilter)}
      className="input-field min-h-12 w-32 shrink-0 px-2 text-sm sm:w-40">
      <option value="all">Tutti i tipi</option>
      {DISH_CATEGORIES.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}
      <option value="uncategorized">Senza categoria</option>
    </select>
  </div>
}
