import { FOOD_CATEGORIES } from '../../data/foodCategories'

const DISH_ICONS = [
  { icon: '🍝', label: 'Pasta' },
  { icon: '🍕', label: 'Pizza' },
  { icon: '🥗', label: 'Insalata' },
  { icon: '🍲', label: 'Zuppa' },
  { icon: '🥘', label: 'Piatto cotto' },
  { icon: '🍳', label: 'Frittata' },
  { icon: '🥪', label: 'Panino' },
  { icon: '🍔', label: 'Burger' },
  { icon: '🍛', label: 'Riso condito' },
  { icon: '🍣', label: 'Sushi' },
  { icon: '🥣', label: 'Bowl' },
  { icon: '🥞', label: 'Pancake' },
]

interface Props {
  automaticIcon: string
  selectedIcon: string | null
  onSelect: (icon: string | null) => void
  saving?: boolean
}

export default function DishIconChoices({ automaticIcon, selectedIcon, onSelect, saving = false }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">Scegli l’icona del piatto. Puoi tornare a quella del primo ingrediente in qualsiasi momento.</p>
      <button type="button" onClick={() => onSelect(null)} disabled={saving}
        aria-pressed={selectedIcon === null}
        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm disabled:opacity-50 ${selectedIcon === null ? 'border-primary-500 bg-primary-500/15' : 'border-gray-700 bg-gray-900/30'}`}>
        <span className="text-2xl">{automaticIcon}</span>
        <span>Automatica · primo ingrediente</span>
      </button>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Piatti</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {DISH_ICONS.map(option => (
          <button key={option.icon} type="button" onClick={() => onSelect(option.icon)} disabled={saving}
            aria-label={option.label} aria-pressed={selectedIcon === option.icon}
            className={`flex min-h-16 flex-col items-center justify-center rounded-xl border p-2 disabled:opacity-50 ${selectedIcon === option.icon ? 'border-primary-500 bg-primary-500/15' : 'border-gray-700 bg-gray-900/30 hover:border-gray-500'}`}>
            <span className="text-2xl">{option.icon}</span>
            <span className="mt-1 line-clamp-1 w-full text-center text-[10px] text-gray-400">{option.label}</span>
          </button>
        ))}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Ingredienti</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {FOOD_CATEGORIES.map(category => (
          <button key={category.id} type="button" onClick={() => onSelect(category.icon)} disabled={saving}
            aria-label={category.label} aria-pressed={selectedIcon === category.icon}
            className={`flex min-h-16 flex-col items-center justify-center rounded-xl border p-2 disabled:opacity-50 ${selectedIcon === category.icon ? 'border-primary-500 bg-primary-500/15' : 'border-gray-700 bg-gray-900/30 hover:border-gray-500'}`}>
            <span className="text-2xl">{category.icon}</span>
            <span className="mt-1 line-clamp-1 w-full text-center text-[10px] text-gray-400">{category.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
