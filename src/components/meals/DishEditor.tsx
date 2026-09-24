import { Fragment, useState } from 'react'
import FoodSearch from './FoodSearch'
import type { DishItem, DishMealType, MealItemUnit, PieceSize } from '../../types'
import { FOOD_CATEGORY_BY_ID } from '../../data/foodCategories'
import { DISH_MEAL_TYPES } from '../../data/dishMealTypes'
import IngredientQuantityInput from './IngredientQuantityInput'

export type DishItemDraft = Omit<DishItem, 'id' | 'dish_id' | 'position' | 'created_at'> & {
  id?: string
  dish_item_id?: string | null
  is_customization?: boolean
  unit?: MealItemUnit
}

interface Props {
  initialName: string
  initialItems: DishItemDraft[]
  initialMealTypes?: DishMealType[]
  onSave: (name: string, items: DishItemDraft[], mealTypes: DishMealType[]) => Promise<void>
  onCancel: () => void
  requireName?: boolean
  saveLabel?: string
  showMealTypes?: boolean
  separateCustomizations?: boolean
}

export default function DishEditor({
  initialName, initialItems, initialMealTypes = ['lunch'], onSave, onCancel,
  requireName = true, saveLabel = 'Salva piatto', showMealTypes = true, separateCustomizations = false,
}: Props) {
  const [name, setName] = useState(initialName)
  const [mealTypes, setMealTypes] = useState<DishMealType[]>(initialMealTypes)
  const [items, setItems] = useState<DishItemDraft[]>(initialItems)
  const [searchKey, setSearchKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalWeight = items.reduce((s, i) => s + (i.unit === 'ml' ? 0 : i.quantity_g), 0)
  const totalVolume = items.reduce((s, i) => s + (i.unit === 'ml' ? i.quantity_g : 0), 0)
  const totalKcal = items.reduce((s, i) => s + i.calories, 0)
  const totalProtein = items.reduce((s, i) => s + i.protein_g, 0)
  const totalCarbs = items.reduce((s, i) => s + i.carbs_g, 0)
  const totalFat = items.reduce((s, i) => s + i.fat_g, 0)
  const orderedItems = items.map((item, index) => ({ item, index }))
  if (separateCustomizations) orderedItems.sort((a, b) => Number(Boolean(a.item.is_customization)) - Number(Boolean(b.item.is_customization)))

  function updateQuantity(index: number, quantity_g: number) {
    if (!Number.isFinite(quantity_g) || quantity_g <= 0) return
    setItems(prev => prev.map((it, i) => {
      if (i !== index) return it
      const factor = it.quantity_g > 0 ? quantity_g / it.quantity_g : 0
      return {
        ...it,
        quantity_g,
        calories: Math.round(it.calories * factor),
        protein_g: Math.round(it.protein_g * factor * 10) / 10,
        carbs_g: Math.round(it.carbs_g * factor * 10) / 10,
        fat_g: Math.round(it.fat_g * factor * 10) / 10,
        fiber_g: it.fiber_g == null ? null : Math.round(it.fiber_g * factor * 100) / 100,
        sugars_g: it.sugars_g == null ? null : Math.round(it.sugars_g * factor * 100) / 100,
        salt_g: it.salt_g == null ? null : Math.round(it.salt_g * factor * 100) / 100,
      }
    }))
  }

  function updatePiece(index: number, piece: { size: PieceSize; count: number } | null) {
    setItems(prev => prev.map((item, itemIndex) => itemIndex === index
      ? { ...item, piece_count: piece?.count ?? null, piece_size: piece?.size ?? null }
      : item))
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const nameValid = !requireName || name.trim().length > 0
  const itemsValid = items.every(i => i.quantity_g > 0 &&
    i.calories >= 0 && i.protein_g >= 0 && i.carbs_g >= 0 && i.fat_g >= 0 &&
    [i.fiber_g, i.sugars_g, i.salt_g].every(value => value == null || value >= 0))
  const canSave = nameValid && (!showMealTypes || mealTypes.length > 0) && items.length > 0 && itemsValid && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      await onSave(name.trim(), items, mealTypes)
    } catch {
      setError('Operazione non riuscita. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {requireName && (
        <div className="rounded-2xl border border-gray-700 bg-gray-900/30 p-4 focus-within:border-primary-600">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nome del piatto</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Es. Pasta al pomodoro"
            className="mt-1 w-full bg-transparent text-xl font-semibold text-white outline-none placeholder:text-gray-600" />
        </div>
      )}

      {showMealTypes && (
        <fieldset className="rounded-2xl border border-gray-700 bg-gray-900/30 p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Categorie del piatto</legend>
          <p className="mb-3 text-xs text-gray-500">Puoi sceglierne più di una.</p>
          <div className="grid grid-cols-2 gap-2">
            {DISH_MEAL_TYPES.map(type => (
              <label key={type.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${mealTypes.includes(type.id)
                ? 'border-primary-500/60 bg-primary-500/15 text-white' : 'border-gray-700 bg-gray-800/50 text-gray-400'}`}>
                <input type="checkbox" checked={mealTypes.includes(type.id)}
                  onChange={event => setMealTypes(current => event.target.checked
                    ? [...current, type.id] : current.filter(value => value !== type.id))}
                  className="accent-primary-500" />
                <span aria-hidden="true">{type.icon}</span>{type.label}
              </label>
            ))}
          </div>
          {mealTypes.length === 0 && <p className="mt-2 text-xs text-amber-400">Scegli almeno una categoria.</p>}
        </fieldset>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Aggiungi ingredienti</p>
          <span className="text-xs text-gray-600">{items.length} nel piatto</span>
        </div>
        <div className="rounded-2xl border border-gray-700/80 bg-gray-900/25 p-3">
          <FoodSearch
            key={searchKey}
            hideHeader
            allowManualEntry={!showMealTypes && !separateCustomizations}
            onClose={() => {}}
            onAdd={(item) => {
              setItems(prev => [...prev, { ...item, is_customization: separateCustomizations }])
              setSearchKey(k => k + 1)
            }}
          />
        </div>
      </section>

      <section className="space-y-2">
        {items.length > 0 && (
          <p className="px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Composizione</p>
        )}
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-700 py-7 text-center">
            <span className="text-2xl">🥕</span>
            <p className="mt-2 text-sm text-gray-500">Cerca e aggiungi il primo ingrediente</p>
          </div>
        )}
        {orderedItems.map(({ item, index: i }, position) => (
          <Fragment key={`${item.food_name}-${i}`}>
          {separateCustomizations && (position === 0 || Boolean(orderedItems[position - 1].item.is_customization) !== Boolean(item.is_customization)) && (
            <p className="px-1 pt-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {item.is_customization ? 'Ingredienti aggiunti' : 'Ricetta base'}
            </p>
          )}
          <div className="rounded-2xl bg-gray-900/35 p-3 ring-1 ring-gray-700/60">
            <div className="flex items-center">
              <div className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-700/70 text-sm">{FOOD_CATEGORY_BY_ID[item.category].icon}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.food_name}</p>
                <span className="text-xs text-primary-400">{Math.round(item.calories)} kcal</span>
              </div>
              <button type="button" onClick={() => removeItem(i)} className="ml-2 text-lg text-gray-600 hover:text-red-400" aria-label={`Rimuovi ${item.food_name}`}>✕</button>
            </div>
            <div className="mt-2 pl-12">
              <IngredientQuantityInput
                foodName={item.food_name}
                category={item.category}
                grams={item.quantity_g}
                onChange={value => updateQuantity(i, value)}
                pieceSize={item.piece_size}
                pieceCount={item.piece_count}
                onPieceChange={piece => updatePiece(i, piece)}
                unit={item.unit}
                compact
              />
              <p className="mt-2 text-xs text-gray-500">
                P {item.protein_g} g · C {item.carbs_g} g · G {item.fat_g} g
                {item.fiber_g != null ? ` · Fibre ${item.fiber_g} g` : ''}
                {item.sugars_g != null ? ` · Zuccheri ${item.sugars_g} g` : ''}
                {item.salt_g != null ? ` · Sale ${item.salt_g} g` : ''}
              </p>
            </div>
          </div>
          </Fragment>
        ))}
      </section>

      {items.length > 0 && <p className="text-xs text-gray-500">Per correggere i valori nutrizionali di un ingrediente, modificalo in Dispensa.</p>}

      {items.length > 0 && (
        <div className="rounded-3xl bg-gradient-to-r from-primary-600/20 to-emerald-400/5 p-4 ring-1 ring-primary-500/20">
          <div className="flex items-end justify-between">
            <div><p className="text-xs text-gray-500">Totale piatto</p><p className="text-2xl font-bold">{Math.round(totalKcal)} <span className="text-sm font-normal text-primary-400">kcal</span></p></div>
            <p className="text-sm text-gray-400">
              {Math.round(totalWeight)} g{totalVolume > 0 ? ` + ${Math.round(totalVolume)} ml` : ''}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <span className="rounded-lg bg-black/10 py-1.5 text-gray-400">P <b className="text-gray-200">{Math.round(totalProtein)}g</b></span>
            <span className="rounded-lg bg-black/10 py-1.5 text-gray-400">C tot. <b className="text-gray-200">{Math.round(totalCarbs)}g</b></span>
            <span className="rounded-lg bg-black/10 py-1.5 text-gray-400">G tot. <b className="text-gray-200">{Math.round(totalFat)}g</b></span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400" role="alert">{error}</p>}

      <div className="grid grid-cols-[auto_1fr] gap-3 pt-1">
        <button type="button" onClick={onCancel}
          className="rounded-2xl border border-gray-700 px-5 py-3.5 font-medium text-gray-400 hover:bg-gray-700">
          Annulla
        </button>
        <button type="button" onClick={handleSave} disabled={!canSave}
          className="rounded-2xl bg-primary-500 px-5 py-3.5 font-semibold shadow-lg shadow-primary-900/30 hover:bg-primary-400 disabled:opacity-40">
          {saveLabel}
        </button>
      </div>
    </div>
  )
}
