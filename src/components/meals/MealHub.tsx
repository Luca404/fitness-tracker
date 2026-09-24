import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import * as api from '../../services/api'
import DishEditor, { type DishItemDraft } from './DishEditor'
import DishIconChoices from '../kitchen/DishIconChoices'
import Modal from '../common/Modal'
import FoodSearch from './FoodSearch'
import IngredientQuantityInput from './IngredientQuantityInput'
import { BASIC_FOODS, type BasicFood } from '../../data/basicFoods'
import { FOOD_CATEGORY_BY_ID } from '../../data/foodCategories'
import { getDishIcon, getFoodIcon } from '../../utils/foodIcons'
import { getExtendedNutritionTotals } from '../../utils/extendedNutrition'
import { dishMealTypeLabels, dishesForMeal } from '../../data/dishMealTypes'
import type { Dish, DishItem, DishMealType, PieceSize } from '../../types'
import ExtendedNutrition from './ExtendedNutrition'

interface Props {
  onAddEntry: (name: string, items: DishItemDraft[], dishId?: string, dishIcon?: string | null) => Promise<void>
  onDishUpdated?: () => Promise<void>
  beveragesOnly?: boolean
  mode: MealHubMode
  setMode: (mode: MealHubMode) => void
  mealType: DishMealType
}

function referenceWeight(dish: Dish): number {
  return dish.items.reduce((s, i) => s + i.quantity_g, 0)
}

function totalKcal(dish: Dish): number {
  return dish.items.reduce((s, i) => s + i.calories, 0)
}

function toDraftItem(i: DishItem): DishItemDraft {
  return {
    id: i.id,
    food_name: i.food_name,
    quantity_g: i.quantity_g,
    piece_count: i.piece_count ?? null,
    piece_size: i.piece_size ?? null,
    calories: i.calories,
    protein_g: i.protein_g,
    carbs_g: i.carbs_g,
    fat_g: i.fat_g,
    fiber_g: i.fiber_g ?? null,
    sugars_g: i.sugars_g ?? null,
    salt_g: i.salt_g ?? null,
    source: i.source,
    off_food_id: i.off_food_id,
    category: i.category,
    food_key: i.food_key,
    pantry_item_id: i.pantry_item_id ?? null,
  }
}

const QUICK_BEVERAGE_IDS = new Set([
  'acqua-naturale', 'acqua-frizzante', 'coca-cola', 'coca-cola-zero',
  'succo-arancia', 'te-freddo', 'caffe-nero', 'birra-chiara', 'vino-rosso', 'vino-bianco', 'spritz',
])
const QUICK_BEVERAGES = BASIC_FOODS.filter(food => QUICK_BEVERAGE_IDS.has(food.id))

function defaultBeverageVolume(beverage: BasicFood) {
  if (beverage.id.startsWith('vino') || beverage.id === 'spritz') return 150
  if (beverage.id === 'caffe-nero') return 40
  if (beverage.id.includes('acqua')) return 500
  return 330
}

function beverageEmoji(beverage: BasicFood) {
  if (beverage.id.includes('acqua')) return '💧'
  if (beverage.id === 'birra-chiara') return '🍺'
  if (beverage.id.startsWith('vino')) return '🍷'
  if (beverage.id === 'spritz') return '🍹'
  if (beverage.id === 'caffe-nero') return '☕'
  return '🥤'
}

function beverageToDraft(beverage: BasicFood, volumeMl: number): DishItemDraft {
  const factor = volumeMl / 100
  return {
    food_name: beverage.name,
    quantity_g: volumeMl,
    unit: 'ml',
    calories: Math.round(beverage.calories * factor),
    protein_g: Math.round(beverage.protein_g * factor * 10) / 10,
    carbs_g: Math.round(beverage.carbs_g * factor * 10) / 10,
    fat_g: Math.round(beverage.fat_g * factor * 10) / 10,
    fiber_g: beverage.fiber_g == null ? null : Math.round(beverage.fiber_g * factor * 100) / 100,
    sugars_g: beverage.sugars_g == null ? null : Math.round(beverage.sugars_g * factor * 100) / 100,
    salt_g: beverage.salt_g == null ? null : Math.round(beverage.salt_g * factor * 100) / 100,
    source: 'basic',
    off_food_id: null,
    category: beverage.category,
    food_key: `basic:${beverage.id}`,
    pantry_item_id: null,
  }
}

export type MealHubMode = 'list' | 'new' | 'oneoff' | 'edit' | 'pick'

export default function MealHub({ onAddEntry, onDishUpdated, beveragesOnly = false, mode, setMode, mealType }: Props) {
  const { user } = useAuth()
  const { showToast, setDishIcon } = useData()
  const [dishes, setDishes] = useState<Dish[]>([])
  const [loading, setLoading] = useState(true)
  const [editingDish, setEditingDish] = useState<Dish | null>(null)
  const [pickingDish, setPickingDish] = useState<Dish | null>(null)
  const [iconDish, setIconDish] = useState<Dish | null>(null)
  const [iconSaving, setIconSaving] = useState(false)
  const [targetWeight, setTargetWeight] = useState(0)
  const [selectedBeverage, setSelectedBeverage] = useState<BasicFood | null>(null)
  const [beverageVolume, setBeverageVolume] = useState(330)
  const [extraItems, setExtraItems] = useState<DishItemDraft[]>([])
  const [extraSearchKey, setExtraSearchKey] = useState(0)
  const [addingExtra, setAddingExtra] = useState(false)
  const visibleDishes = dishesForMeal(dishes, mealType)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setDishes(await api.getDishes())
    } catch {
      showToast('Errore caricamento piatti')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  async function saveDishIcon(icon: string | null) {
    if (!iconDish || iconSaving) return
    setIconSaving(true)
    try {
      await api.updateDishIcon(iconDish.id, icon)
      setDishIcon(iconDish.id, icon)
      setDishes(current => current.map(dish => dish.id === iconDish.id ? { ...dish, icon } : dish))
      setPickingDish(current => current?.id === iconDish.id ? { ...current, icon } : current)
      setIconDish(null)
      showToast('Icona aggiornata')
    } catch {
      showToast('Errore modifica icona')
    } finally {
      setIconSaving(false)
    }
  }

  const iconPicker = (
    <Modal open={iconDish !== null} onClose={() => setIconDish(null)} title={iconDish ? `Icona di ${iconDish.name}` : 'Icona del piatto'}>
      {iconDish && (
        <DishIconChoices automaticIcon={getFoodIcon(iconDish.items)} selectedIcon={iconDish.icon}
          onSelect={icon => { void saveDishIcon(icon) }} saving={iconSaving} />
      )}
    </Modal>
  )

  useEffect(() => { refresh() }, [refresh])

  function startPick(dish: Dish) {
    setPickingDish(dish)
    setTargetWeight(Math.round(referenceWeight(dish)))
    setExtraItems([])
    setAddingExtra(false)
    setMode('pick')
  }

  function chooseBeverage(beverage: BasicFood) {
    setSelectedBeverage(beverage)
    setBeverageVolume(defaultBeverageVolume(beverage))
  }

  function startEdit(dish: Dish) {
    setEditingDish(dish)
    setMode('edit')
  }

  async function handleDelete(id: string) {
    const dish = dishes.find(item => item.id === id)
    if (!window.confirm(`Eliminare “${dish?.name ?? 'questo piatto'}” dai piatti salvati?`)) return
    try {
      await api.deleteDish(id)
      await refresh()
    } catch {
      showToast('Errore eliminazione piatto')
    }
  }

  async function confirmPick() {
    if (!pickingDish) return
    const ref = referenceWeight(pickingDish)
    const factor = ref > 0 ? targetWeight / ref : 1
    const dishItems: DishItemDraft[] = pickingDish.items.map(i => ({
      dish_item_id: i.id,
      is_customization: false,
      food_name: i.food_name,
      quantity_g: Math.round(i.quantity_g * factor * 10) / 10,
      piece_count: i.piece_count == null ? null : Math.round(i.piece_count * factor * 10) / 10,
      piece_size: i.piece_size ?? null,
      calories: Math.round(i.calories * factor),
      protein_g: Math.round(i.protein_g * factor * 10) / 10,
      carbs_g: Math.round(i.carbs_g * factor * 10) / 10,
      fat_g: Math.round(i.fat_g * factor * 10) / 10,
      fiber_g: i.fiber_g == null ? null : Math.round(i.fiber_g * factor * 100) / 100,
      sugars_g: i.sugars_g == null ? null : Math.round(i.sugars_g * factor * 100) / 100,
      salt_g: i.salt_g == null ? null : Math.round(i.salt_g * factor * 100) / 100,
      source: i.source,
      off_food_id: i.off_food_id,
      category: i.category,
      food_key: i.food_key,
      pantry_item_id: i.pantry_item_id ?? null,
    }))
    await onAddEntry(pickingDish.name, [...dishItems, ...extraItems.map(item => ({ ...item, is_customization: true }))], pickingDish.id, pickingDish.icon)
    setPickingDish(null)
    setExtraItems([])
    setMode('list')
  }

  async function confirmBeverage() {
    if (!selectedBeverage || beverageVolume <= 0) return
    await onAddEntry(selectedBeverage.name, [beverageToDraft(selectedBeverage, beverageVolume)])
    setSelectedBeverage(null)
  }

  function updateExtraQuantity(index: number, quantity: number) {
    if (!Number.isFinite(quantity) || quantity <= 0) return
    setExtraItems(items => items.map((item, itemIndex) => {
      if (itemIndex !== index) return item
      const factor = item.quantity_g > 0 ? quantity / item.quantity_g : 0
      return {
        ...item,
        quantity_g: quantity,
        calories: Math.round(item.calories * factor),
        protein_g: Math.round(item.protein_g * factor * 10) / 10,
        carbs_g: Math.round(item.carbs_g * factor * 10) / 10,
        fat_g: Math.round(item.fat_g * factor * 10) / 10,
        fiber_g: item.fiber_g == null ? null : Math.round(item.fiber_g * factor * 100) / 100,
        sugars_g: item.sugars_g == null ? null : Math.round(item.sugars_g * factor * 100) / 100,
        salt_g: item.salt_g == null ? null : Math.round(item.salt_g * factor * 100) / 100,
      }
    }))
  }

  function updateExtraPiece(index: number, piece: { size: PieceSize; count: number } | null) {
    setExtraItems(items => items.map((item, itemIndex) => itemIndex === index
      ? { ...item, piece_count: piece?.count ?? null, piece_size: piece?.size ?? null }
      : item))
  }

  async function handleSaveNewDish(name: string, items: DishItemDraft[], mealTypes: DishMealType[]) {
    if (!user) return
    const dish = await api.createDish(user.id, name, items, mealTypes)
    await onAddEntry(name, items.map((item, index) => ({
      ...item,
      dish_item_id: dish.items[index]?.id ?? null,
    })), dish.id)
    setMode('list')
    await refresh()
  }

  async function handleSaveEditedDish(name: string, items: DishItemDraft[], mealTypes: DishMealType[]) {
    if (!editingDish) return
    await api.updateDish(editingDish.id, name, items, mealTypes)
    await onDishUpdated?.()
    setEditingDish(null)
    setMode('list')
    await refresh()
  }

  async function handleSaveOneoff(name: string, items: DishItemDraft[]) {
    await onAddEntry(name, items)
    setMode('list')
  }

  if (beveragesOnly) {
    const beverageItem = selectedBeverage && beverageVolume > 0
      ? beverageToDraft(selectedBeverage, beverageVolume)
      : null
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Bevande</p>
            <h3 className="mt-0.5 text-lg font-bold">Cosa hai bevuto?</h3>
          </div>
          <span className="text-2xl">🥤</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_BEVERAGES.map(beverage => (
            <button
              key={beverage.id}
              type="button"
              onClick={() => chooseBeverage(beverage)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-xs transition ${selectedBeverage?.id === beverage.id ? 'border-primary-500 bg-primary-950/30 text-white' : 'border-gray-700/80 bg-gray-800/60 hover:border-primary-600'}`}
            >
              <span className="text-lg">{beverageEmoji(beverage)}</span>
              <span className="truncate">{beverage.name}</span>
            </button>
          ))}
        </div>
        {selectedBeverage && (
          <div className="space-y-3 rounded-2xl border border-gray-700 bg-gray-900/30 p-4">
            <label className="flex items-center rounded-xl border border-gray-700 bg-gray-800/70 px-3 focus-within:border-primary-500">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Quantità</span>
              <input
                type="number"
                min={1}
                value={beverageVolume === 0 ? '' : beverageVolume}
                onChange={event => setBeverageVolume(parseInt(event.target.value) || 0)}
                onFocus={event => event.currentTarget.select()}
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-right text-xl font-bold outline-none"
              />
              <span className="text-sm text-gray-500">ml</span>
            </label>
            <button type="button" onClick={confirmBeverage} disabled={!beverageItem}
              className="w-full rounded-xl bg-primary-500 py-3 font-semibold hover:bg-primary-400 disabled:opacity-40">
              Registra {beverageItem?.calories ?? 0} kcal
            </button>
          </div>
        )}
      </div>
    )
  }

  if (mode === 'new') {
    return (
      <div className="space-y-5">
        <ComposerHeader icon="🍳" eyebrow="Nuova ricetta" title="Componi il tuo piatto" />
        <DishEditor
          initialName=""
          initialItems={[]}
          initialMealTypes={[mealType]}
          requireName
          saveLabel="Salva e aggiungi"
          onSave={handleSaveNewDish}
          onCancel={() => setMode('list')}
        />
      </div>
    )
  }

  if (mode === 'edit' && editingDish) {
    return (
      <div className="space-y-5">
        <ComposerHeader icon="⚙️" eyebrow="Piatto salvato" title="Modifica la ricetta" />
        <DishEditor
          initialName={editingDish.name}
          initialItems={editingDish.items.map(toDraftItem)}
          initialMealTypes={editingDish.meal_types}
          editing
          requireName
          saveLabel="Salva modifiche"
          onSave={handleSaveEditedDish}
          onCancel={() => { setEditingDish(null); setMode('list') }}
        />
      </div>
    )
  }

  if (mode === 'oneoff') {
    return (
      <div className="space-y-5">
        <ComposerHeader icon="✨" eyebrow="Inserimento veloce" title="Piatto occasionale" />
        <DishEditor
          initialName=""
          initialItems={[]}
          showMealTypes={false}
          requireName
          saveLabel="Aggiungi al diario"
          onSave={handleSaveOneoff}
          onCancel={() => setMode('list')}
        />
      </div>
    )
  }

  if (mode === 'pick' && pickingDish) {
    const ref = referenceWeight(pickingDish)
    const factor = ref > 0 ? targetWeight / ref : 1
    const scaledKcal = Math.round(totalKcal(pickingDish) * factor) + Math.round(extraItems.reduce((sum, item) => sum + item.calories, 0))
    const protein = pickingDish.items.reduce((sum, item) => sum + item.protein_g, 0) * factor + extraItems.reduce((sum, item) => sum + item.protein_g, 0)
    const carbs = pickingDish.items.reduce((sum, item) => sum + item.carbs_g, 0) * factor + extraItems.reduce((sum, item) => sum + item.carbs_g, 0)
    const fat = pickingDish.items.reduce((sum, item) => sum + item.fat_g, 0) * factor + extraItems.reduce((sum, item) => sum + item.fat_g, 0)
    const extendedTotals = getExtendedNutritionTotals([
      ...pickingDish.items.map(item => ({
        fiber_g: item.fiber_g == null ? null : item.fiber_g * factor,
        sugars_g: item.sugars_g == null ? null : item.sugars_g * factor,
        salt_g: item.salt_g == null ? null : item.salt_g * factor,
      })),
      ...extraItems,
    ])
    return (
      <div className="space-y-5">
        <div className="rounded-3xl bg-gradient-to-br from-primary-600/25 via-gray-800 to-gray-800 p-5 ring-1 ring-primary-500/20">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setIconDish(pickingDish)}
              aria-label={`Cambia icona di ${pickingDish.name}`}
              className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/15 text-3xl">
              {getDishIcon(pickingDish)}<span aria-hidden="true" className="absolute -bottom-1 -right-1 rounded-full bg-gray-700 px-1 text-[10px]">✎</span>
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-400">Piatto salvato</p>
              <h3 className="truncate text-xl font-bold">{pickingDish.name}</h3>
              <p className="text-sm text-gray-400">Ricetta base: {Math.round(ref)} g</p>
            </div>
            <p className="text-xl font-bold text-primary-400">{scaledKcal}<span className="ml-1 text-xs font-normal">kcal</span></p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <MacroPill label="Proteine" value={protein} />
            <MacroPill label="Carbo tot." value={carbs} />
            <MacroPill label="Grassi tot." value={fat} />
          </div>
          <ExtendedNutrition totals={extendedTotals} detailedLabels />
        </div>
        <div className="rounded-2xl border border-gray-700 bg-gray-900/30 p-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Quanto ne hai mangiato?</label>
          <div className="mt-2 flex items-center gap-3">
            <input type="number" min={1} value={targetWeight === 0 ? '' : targetWeight}
              onChange={e => setTargetWeight(parseInt(e.target.value) || 0)}
              className="min-w-0 flex-1 bg-transparent text-3xl font-bold outline-none" />
            <span className="text-lg text-gray-500">grammi</span>
          </div>
        </div>
        <section className="rounded-2xl border border-gray-700 bg-gray-900/25 p-4">
          <button type="button" onClick={() => setAddingExtra(open => !open)} className="flex w-full items-center justify-between text-left">
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500">Personalizza</span>
              <span className="mt-0.5 block text-sm font-medium text-gray-300">Aggiungi un ingrediente</span>
            </span>
            <span className="text-xl text-primary-400">{addingExtra ? '−' : '+'}</span>
          </button>
          {addingExtra && (
            <div className="mt-4 border-t border-gray-700 pt-4">
              <FoodSearch
                key={extraSearchKey}
                hideHeader
                allowManualEntry={false}
                onClose={() => {}}
                onAdd={item => {
                  setExtraItems(items => [...items, item])
                  setExtraSearchKey(key => key + 1)
                }}
              />
            </div>
          )}
        </section>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Composizione</p>
          {pickingDish.items.map(item => (
            <div key={item.id} className="flex justify-between rounded-xl bg-gray-900/30 px-3 py-2 text-sm">
              <span className="text-gray-300">{item.food_name}</span>
              <span className="text-gray-500">{Math.round(item.quantity_g * factor)} g</span>
            </div>
          ))}
          {extraItems.map((item, index) => (
            <div key={`${item.food_name}-${index}`} className="rounded-xl bg-primary-950/20 p-3 text-sm ring-1 ring-primary-500/15">
              <div className="flex items-center gap-2">
                <span>{FOOD_CATEGORY_BY_ID[item.category]?.icon ?? '📦'}</span>
                <span className="min-w-0 flex-1 truncate text-gray-300">{item.food_name}</span>
                <button type="button" onClick={() => setExtraItems(items => items.filter((_, itemIndex) => itemIndex !== index))}
                  className="text-gray-600 hover:text-red-400" aria-label={`Rimuovi ${item.food_name}`}>✕</button>
              </div>
              <div className="mt-2 pl-7">
                <IngredientQuantityInput
                  foodName={item.food_name}
                  category={item.category}
                  grams={item.quantity_g}
                  unit={item.unit}
                  compact
                  onChange={quantity => updateExtraQuantity(index, quantity)}
                  pieceSize={item.piece_size}
                  pieceCount={item.piece_count}
                  onPieceChange={piece => updateExtraPiece(index, piece)}
                />
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={confirmPick} disabled={targetWeight <= 0}
          className="w-full rounded-2xl bg-primary-500 py-4 font-semibold shadow-lg shadow-primary-900/30 transition hover:bg-primary-400 disabled:opacity-40">
          Aggiungi {scaledKcal} kcal al diario
        </button>
        {iconPicker}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setMode('new')}
          className="rounded-2xl border border-gray-700 bg-gray-900/30 p-4 text-left transition hover:border-primary-600 hover:bg-primary-950/20">
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-xl">🍳</span>
          <span className="block text-sm font-semibold">Nuova ricetta</span>
          <span className="mt-1 block text-xs leading-snug text-gray-500">Componi, salva e registra</span>
        </button>
        <button type="button" onClick={() => setMode('oneoff')}
          className="rounded-2xl border border-gray-700 bg-gray-900/30 p-4 text-left transition hover:border-primary-600 hover:bg-primary-950/20">
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/10 text-xl">✨</span>
          <span className="block text-sm font-semibold">Occasionale</span>
          <span className="mt-1 block text-xs leading-snug text-gray-500">Solo nel diario di oggi</span>
        </button>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">La tua cucina</p>
            <p className="text-sm font-medium text-gray-300">Piatti salvati</p>
          </div>
          <span className="rounded-full bg-gray-700 px-2.5 py-1 text-xs text-gray-400">{visibleDishes.length}</span>
        </div>
        {loading ? (
          <p className="text-sm text-gray-500 text-center py-4">Caricamento...</p>
        ) : visibleDishes.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Nessun piatto salvato per questo pasto.</p>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {visibleDishes.map(dish => (
              <div key={dish.id} className="group flex items-center gap-2 rounded-2xl border border-gray-700/70 bg-gray-900/30 p-2 transition hover:border-gray-600">
                <button type="button" onClick={() => setIconDish(dish)}
                  aria-label={`Cambia icona di ${dish.name}`}
                  className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-xl">
                  {getDishIcon(dish)}<span aria-hidden="true" className="absolute -bottom-1 -right-1 rounded-full bg-gray-700 px-1 text-[10px]">✎</span>
                </button>
                <button type="button" onClick={() => startPick(dish)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{dish.name}</span>
                    <span className="text-xs text-gray-500">{Math.round(totalKcal(dish))} kcal · {Math.round(referenceWeight(dish))} g</span>
                    <span className="block truncate text-[11px] text-primary-400/80">{dishMealTypeLabels(dish.meal_types)}</span>
                  </span>
                </button>
                <button type="button" onClick={() => startEdit(dish)}
                  className="rounded-xl p-2 text-gray-500 hover:bg-gray-700 hover:text-gray-200" aria-label="Modifica piatto">✎</button>
                <button type="button" onClick={() => handleDelete(dish.id)}
                  className="rounded-xl p-2 text-gray-600 hover:bg-red-950/30 hover:text-red-400" aria-label="Elimina piatto">🗑️</button>
              </div>
            ))}
          </div>
        )}
      </div>
      {iconPicker}
    </div>
  )
}

function ComposerHeader({ icon, eyebrow, title }: {
  icon: string
  eyebrow: string
  title: string
}) {
  return (
    <div className="flex items-center gap-3 px-1">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-xl">{icon}</span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">{eyebrow}</p>
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
    </div>
  )
}

function MacroPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-black/15 p-2">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-semibold">{Math.round(value)}g</p>
    </div>
  )
}
