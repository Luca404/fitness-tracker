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
import type { Dish, DishItem, DishMealType, PieceSize, PreparedBatch } from '../../types'
import ExtendedNutrition from './ExtendedNutrition'
import PreparedPortionInput from './PreparedPortionInput'
import PreparedDishesPanel from './PreparedDishesPanel'
import { defaultCookingMethod, estimateCookedItemWeights, estimateCookedWeight, recipeSignature, type CookingMethod } from '../../utils/preparedDishes'
import { formatDecimal, roundToTwo } from '../../utils/decimal'

interface Props {
  onAddEntry: (name: string, items: DishItemDraft[], dishId?: string, dishIcon?: string | null) => Promise<void>
  onDishUpdated?: () => Promise<void>
  beveragesOnly?: boolean
  mode: MealHubMode
  setMode: (mode: MealHubMode) => void
  mealType: DishMealType
  date: string
  onPrepared?: () => Promise<void>
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
    unit: i.unit ?? 'g',
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
    calories: roundToTwo(beverage.calories * factor),
    protein_g: roundToTwo(beverage.protein_g * factor),
    carbs_g: roundToTwo(beverage.carbs_g * factor),
    fat_g: roundToTwo(beverage.fat_g * factor),
    fiber_g: beverage.fiber_g == null ? null : roundToTwo(beverage.fiber_g * factor),
    sugars_g: beverage.sugars_g == null ? null : roundToTwo(beverage.sugars_g * factor),
    salt_g: beverage.salt_g == null ? null : roundToTwo(beverage.salt_g * factor),
    source: 'basic',
    off_food_id: null,
    category: beverage.category,
    food_key: `basic:${beverage.id}`,
    pantry_item_id: null,
  }
}

export type MealHubMode = 'list' | 'ingredient' | 'new' | 'oneoff' | 'edit' | 'pick' | 'prepare' | 'prepared-pick'

export default function MealHub({ onAddEntry, onDishUpdated, onPrepared, beveragesOnly = false, mode, setMode, mealType, date }: Props) {
  const { user } = useAuth()
  const { showToast, setDishIcon } = useData()
  const [dishes, setDishes] = useState<Dish[]>([])
  const [loading, setLoading] = useState(true)
  const [editingDish, setEditingDish] = useState<Dish | null>(null)
  const [pickingDish, setPickingDish] = useState<Dish | null>(null)
  const [iconDish, setIconDish] = useState<Dish | null>(null)
  const [iconSaving, setIconSaving] = useState(false)
  const [itemQuantities, setItemQuantities] = useState<Record<string, string>>({})
  const [pendingPreparation, setPendingPreparation] = useState<{
    name: string; items: DishItemDraft[]; sourceDishId: string | null; icon: string | null
  } | null>(null)
  const [cookedWeightOverride, setCookedWeightOverride] = useState<number | null>(null)
  const [cookingMethods, setCookingMethods] = useState<CookingMethod[]>([])
  const [rememberedYieldRatio, setRememberedYieldRatio] = useState<number | null>(null)
  const [firstPortionG, setFirstPortionG] = useState<number | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [addingIngredient, setAddingIngredient] = useState(false)
  const [loggingDish, setLoggingDish] = useState(false)
  const [preparedCount, setPreparedCount] = useState(0)
  const [selectedBatch, setSelectedBatch] = useState<PreparedBatch | null>(null)
  const [preparedGrams, setPreparedGrams] = useState(0)
  const [consumingPrepared, setConsumingPrepared] = useState(false)
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
    setItemQuantities({})
    setExtraItems([])
    setAddingExtra(false)
    setMode('pick')
  }

  function startPreparedPick(batch: PreparedBatch) {
    setSelectedBatch(batch)
    setPreparedGrams(0)
    setMode('prepared-pick')
  }

  async function consumeSelectedBatch() {
    if (!selectedBatch || consumingPrepared || !Number.isFinite(preparedGrams)
      || preparedGrams <= 0 || preparedGrams > selectedBatch.remaining_g) return
    setConsumingPrepared(true)
    try {
      await api.consumePreparedBatch(selectedBatch.id, date, mealType, preparedGrams)
      await onPrepared?.()
      setSelectedBatch(null)
      setMode('list')
      showToast('Porzione registrata')
    } catch {
      showToast('Errore registrazione porzione')
    } finally {
      setConsumingPrepared(false)
    }
  }

  async function closeSelectedBatch() {
    if (!selectedBatch || consumingPrepared
      || !window.confirm(`Concludere “${selectedBatch.dish.name}”? Il resto non sarà più tra i piatti pronti.`)) return
    setConsumingPrepared(true)
    try {
      await api.closePreparedBatch(selectedBatch.id)
      setSelectedBatch(null)
      setMode('list')
      showToast('Preparazione conclusa')
    } catch {
      showToast('Errore chiusura preparazione')
    } finally {
      setConsumingPrepared(false)
    }
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

  function pickedItems(): DishItemDraft[] {
    if (!pickingDish) return []
    const dishItems: DishItemDraft[] = pickingDish.items.map(i => {
      const rawQuantity = Number(itemQuantities[i.id] ?? i.quantity_g)
      const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? roundToTwo(rawQuantity) : 0
      const factor = quantity / i.quantity_g
      const pieceCount = i.piece_count == null ? null : roundToTwo(i.piece_count * factor) || null
      return {
        dish_item_id: i.id,
        is_customization: false,
        food_name: i.food_name,
        quantity_g: quantity,
        unit: i.unit ?? 'g',
        piece_count: pieceCount,
        piece_size: pieceCount == null ? null : i.piece_size ?? null,
        calories: roundToTwo(i.calories * factor),
        protein_g: roundToTwo(i.protein_g * factor),
        carbs_g: roundToTwo(i.carbs_g * factor),
        fat_g: roundToTwo(i.fat_g * factor),
        fiber_g: i.fiber_g == null ? null : roundToTwo(i.fiber_g * factor),
        sugars_g: i.sugars_g == null ? null : roundToTwo(i.sugars_g * factor),
        salt_g: i.salt_g == null ? null : roundToTwo(i.salt_g * factor),
        source: i.source,
        off_food_id: i.off_food_id,
        category: i.category,
        food_key: i.food_key,
        pantry_item_id: i.pantry_item_id ?? null,
      }
    })
    return [...dishItems, ...extraItems.map(item => ({ ...item, is_customization: true }))]
  }

  function validPickedQuantities(): boolean {
    return pickingDish?.items.every(item => {
      const quantity = Number(itemQuantities[item.id] ?? item.quantity_g)
      return Number.isFinite(quantity) && roundToTwo(quantity) > 0
    }) ?? false
  }

  async function logPickedDish() {
    if (!pickingDish || loggingDish || !validPickedQuantities()) return
    setLoggingDish(true)
    try {
      await onAddEntry(pickingDish.name, pickedItems(), pickingDish.id, pickingDish.icon)
      setPickingDish(null)
      setExtraItems([])
      setMode('list')
    } catch {
      // The meal page already reports the failed registration.
    } finally {
      setLoggingDish(false)
    }
  }

  function beginPreparation(name: string, items: DishItemDraft[], dish: Dish | null) {
    const signature = recipeSignature(items)
    const remembered = dish?.cooking_signature === signature && dish.cooking_methods?.length === items.length
    setPendingPreparation({ name, items, sourceDishId: dish?.id ?? null, icon: dish?.icon ?? null })
    setCookingMethods(remembered ? dish.cooking_methods! : items.map(defaultCookingMethod))
    setRememberedYieldRatio(remembered ? dish.measured_yield_ratio ?? null : null)
    setCookedWeightOverride(null)
    setFirstPortionG(null)
    setMode('prepare')
  }

  function preparePickedDish() {
    if (!pickingDish || !validPickedQuantities()) return
    beginPreparation(pickingDish.name, pickedItems(), pickingDish)
    setPickingDish(null)
    setExtraItems([])
  }

  async function confirmBeverage() {
    if (!selectedBeverage || beverageVolume <= 0) return
    await onAddEntry(selectedBeverage.name, [beverageToDraft(selectedBeverage, beverageVolume)])
    setSelectedBeverage(null)
  }

  async function addSingleIngredient(item: DishItemDraft) {
    if (addingIngredient) return
    setAddingIngredient(true)
    try {
      await onAddEntry(item.food_name, [item])
      setMode('list')
    } catch {
      // The meal page already reports the failed registration.
    } finally {
      setAddingIngredient(false)
    }
  }

  function updateExtraQuantity(index: number, quantity: number) {
    if (!Number.isFinite(quantity) || quantity <= 0) return
    setExtraItems(items => items.map((item, itemIndex) => {
      if (itemIndex !== index) return item
      const factor = item.quantity_g > 0 ? quantity / item.quantity_g : 0
      return {
        ...item,
        quantity_g: quantity,
        calories: roundToTwo(item.calories * factor),
        protein_g: roundToTwo(item.protein_g * factor),
        carbs_g: roundToTwo(item.carbs_g * factor),
        fat_g: roundToTwo(item.fat_g * factor),
        fiber_g: item.fiber_g == null ? null : roundToTwo(item.fiber_g * factor),
        sugars_g: item.sugars_g == null ? null : roundToTwo(item.sugars_g * factor),
        salt_g: item.salt_g == null ? null : roundToTwo(item.salt_g * factor),
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
    beginPreparation(name, dish.items.map(toDraftItem), dish)
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
    beginPreparation(name, items, null)
  }

  async function savePreparation() {
    if (!user || !pendingPreparation || preparing) return
    const estimated = estimateCookedWeight(pendingPreparation.items, cookingMethods)
    const rawWeight = pendingPreparation.items.reduce((sum, item) => sum + item.quantity_g, 0)
    const totalCookedG = cookedWeightOverride ?? (rememberedYieldRatio ? roundToTwo(rawWeight * rememberedYieldRatio) : estimated)
    const portionG = firstPortionG ?? totalCookedG
    if (!Number.isFinite(totalCookedG) || !Number.isFinite(portionG)
      || totalCookedG <= 0 || portionG < 0 || portionG > totalCookedG) return
    setPreparing(true)
    try {
      let preferenceSaved = true
      await api.createPreparedBatch({
        userId: user.id,
        name: pendingPreparation.name,
        items: pendingPreparation.items,
        sourceDishId: pendingPreparation.sourceDishId,
        icon: pendingPreparation.icon,
        totalCookedG,
        firstPortionG: portionG,
        date,
        mealType,
      })
      if (pendingPreparation.sourceDishId) {
        try {
          await api.updateDishCookingPreference(
            pendingPreparation.sourceDishId,
            recipeSignature(pendingPreparation.items),
            cookingMethods,
            cookedWeightOverride === null ? rememberedYieldRatio : cookedWeightOverride / rawWeight,
          )
        } catch {
          preferenceSaved = false
        }
      }
      await onPrepared?.()
      await refresh()
      setPendingPreparation(null)
      setMode('list')
      showToast(!preferenceSaved ? 'Preparazione salvata; preferenza di cottura non aggiornata'
        : portionG > 0 ? 'Preparazione salvata e porzione registrata' : 'Preparazione salvata')
    } catch {
      showToast('Errore salvataggio preparazione')
    } finally {
      setPreparing(false)
    }
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
          saveLabel="Salva e prepara"
          onSave={handleSaveNewDish}
          onCancel={() => setMode('list')}
        />
      </div>
    )
  }

  if (mode === 'ingredient') {
    return <div className="space-y-5">
      <ComposerHeader icon="🍎" eyebrow="Inserimento veloce" title="Registra un ingrediente" />
      <FoodSearch hideHeader onClose={() => setMode('list')}
        addLabel="Registra ingrediente" saving={addingIngredient}
        onAdd={item => { void addSingleIngredient(item) }} />
    </div>
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
          saveLabel="Prepara il piatto"
          onSave={handleSaveOneoff}
          onCancel={() => setMode('list')}
        />
      </div>
    )
  }

  if (mode === 'prepare' && pendingPreparation) {
    const estimated = estimateCookedWeight(pendingPreparation.items, cookingMethods)
    const rawWeight = pendingPreparation.items.reduce((sum, item) => sum + item.quantity_g, 0)
    const rememberedWeight = rememberedYieldRatio ? roundToTwo(rawWeight * rememberedYieldRatio) : null
    const totalCookedG = cookedWeightOverride ?? rememberedWeight ?? estimated
    const portionG = firstPortionG ?? totalCookedG
    const totalCalories = pendingPreparation.items.reduce((sum, item) => sum + item.calories, 0)
    const itemWeights = estimateCookedItemWeights(pendingPreparation.items, cookingMethods)
    return <div className="space-y-5">
      <ComposerHeader icon="🍲" eyebrow="Preparazione" title={pendingPreparation.name} />
      <div className="rounded-2xl border border-gray-700 bg-gray-900/30 p-4">
        <p className="text-sm text-gray-300">Ingredienti: {formatDecimal(totalCalories)} kcal in totale</p>
        <p className="mt-2 text-sm font-semibold">Peso cotto stimato: {formatDecimal(estimated)} g</p>
        {rememberedWeight !== null && <p className="mt-1 text-sm text-primary-300">Dall’ultima pesata della ricetta: {formatDecimal(rememberedWeight)} g</p>}
        <p className="mt-1 text-xs text-gray-500">Scegli come hai preparato ogni ingrediente. Il peso finale misurato prevale sulla stima, compreso il sugo rimasto nel piatto.</p>
        <div className="mt-3 space-y-2">
          {pendingPreparation.items.map((item, index) => (
            <div key={`${item.food_name}-${index}`} className="rounded-xl border border-gray-700 bg-gray-800/50 px-3 py-2">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{item.food_name}</span>
                <span className="shrink-0 text-gray-400">{formatDecimal(item.quantity_g)} → {formatDecimal(itemWeights[index])} g</span>
              </div>
              <label className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-400">
                <span>Cottura</span>
                <select aria-label={`Cottura ${item.food_name}`} value={cookingMethods[index] ?? defaultCookingMethod(item)}
                  onChange={event => {
                    setCookingMethods(current => current.map((method, i) => i === index ? event.target.value as CookingMethod : method))
                    setRememberedYieldRatio(null)
                  }}
                  className="rounded-lg border border-gray-600 bg-gray-800 px-2 py-1 text-white">
                  <option value="raw">Crudo / già pronto</option>
                  <option value="boiled">Bollito</option>
                  <option value="pan">In padella</option>
                </select>
              </label>
            </div>
          ))}
        </div>
        <label className="mt-3 block text-xs text-gray-400">Correggi il peso cotto totale (facoltativo)
          <input type="number" min={1} step="0.1" inputMode="decimal"
            value={cookedWeightOverride == null ? '' : formatDecimal(cookedWeightOverride)}
            onChange={event => setCookedWeightOverride(event.target.value === '' ? null : roundToTwo(Number(event.target.value)))}
            placeholder={`${formatDecimal(rememberedWeight ?? estimated)} g suggeriti`}
            className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm outline-none focus:border-primary-500" />
        </label>
      </div>
      <PreparedPortionInput totalCookedG={totalCookedG} remainingG={totalCookedG}
        value={portionG} onChange={setFirstPortionG} allowZero />
      <button type="button" onClick={() => void savePreparation()}
        disabled={preparing || !Number.isFinite(totalCookedG) || totalCookedG <= 0
          || !Number.isFinite(portionG) || portionG < 0 || portionG > totalCookedG}
        className="w-full rounded-xl bg-primary-500 py-3 font-semibold disabled:opacity-40">
        {preparing ? 'Salvataggio…' : portionG > 0 ? 'Salva e registra la porzione' : 'Salva per mangiarlo dopo'}
      </button>
      <button type="button" onClick={() => setMode('list')} className="w-full text-sm text-gray-400">Annulla</button>
    </div>
  }

  if (mode === 'prepared-pick' && selectedBatch) {
    const ratio = selectedBatch.remaining_g / selectedBatch.total_cooked_g
    const remainingKcal = selectedBatch.dish.items.reduce((sum, item) => sum + item.calories, 0) * ratio
    const protein = selectedBatch.dish.items.reduce((sum, item) => sum + item.protein_g, 0) * ratio
    const carbs = selectedBatch.dish.items.reduce((sum, item) => sum + item.carbs_g, 0) * ratio
    const fat = selectedBatch.dish.items.reduce((sum, item) => sum + item.fat_g, 0) * ratio
    return <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-primary-600/25 via-gray-800 to-gray-800 p-5 ring-1 ring-primary-500/20">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-500/15 text-3xl">{getDishIcon(selectedBatch.dish)}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-400">Pronto da mangiare</p>
            <h3 className="truncate text-xl font-bold">{selectedBatch.dish.name}</h3>
            <p className="text-sm text-gray-400">Restano {formatDecimal(selectedBatch.remaining_g)} g</p>
          </div>
          <p className="text-xl font-bold text-primary-400">{formatDecimal(remainingKcal)}<span className="ml-1 text-xs font-normal">kcal</span></p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <MacroPill label="Proteine" value={protein} />
          <MacroPill label="Carbo tot." value={carbs} />
          <MacroPill label="Grassi tot." value={fat} />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Composizione</p>
        {selectedBatch.dish.items.map(item => <div key={item.id} className="flex justify-between rounded-xl bg-gray-900/30 px-3 py-2 text-sm">
          <span className="text-gray-300">{item.food_name}</span>
          <span className="text-gray-500">{formatDecimal(item.quantity_g * ratio)} {item.unit ?? 'g'}</span>
        </div>)}
      </div>
      <PreparedPortionInput totalCookedG={selectedBatch.total_cooked_g} remainingG={selectedBatch.remaining_g}
        value={preparedGrams} onChange={setPreparedGrams} />
      <button type="button" onClick={() => void consumeSelectedBatch()}
        disabled={consumingPrepared || preparedGrams <= 0 || preparedGrams > selectedBatch.remaining_g}
        className="w-full rounded-2xl bg-primary-500 py-3.5 font-semibold disabled:opacity-40">
        {consumingPrepared ? 'Registrazione…' : 'Registra porzione'}
      </button>
      <button type="button" onClick={() => void closeSelectedBatch()} disabled={consumingPrepared}
        className="w-full py-2 text-sm text-gray-500 disabled:opacity-40">Concludi preparazione</button>
    </div>
  }

  if (mode === 'pick' && pickingDish) {
    const selectedItems = pickedItems()
    const validQuantities = validPickedQuantities()
    const scaledKcal = selectedItems.reduce((sum, item) => sum + item.calories, 0)
    const protein = selectedItems.reduce((sum, item) => sum + item.protein_g, 0)
    const carbs = selectedItems.reduce((sum, item) => sum + item.carbs_g, 0)
    const fat = selectedItems.reduce((sum, item) => sum + item.fat_g, 0)
    const extendedTotals = getExtendedNutritionTotals(selectedItems)
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
              <p className="text-sm text-gray-400">{pickingDish.items.length} ingredienti nella ricetta salvata</p>
            </div>
            <p className="text-xl font-bold text-primary-400">{formatDecimal(scaledKcal)}<span className="ml-1 text-xs font-normal">kcal</span></p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void logPickedDish()} disabled={!validQuantities || loggingDish}
              className="rounded-xl bg-primary-500 px-2 py-3 text-sm font-semibold shadow-lg shadow-primary-900/30 transition hover:bg-primary-400 disabled:opacity-40">
              {loggingDish ? 'Registrazione…' : 'Registra tutto'}
            </button>
            <button type="button" onClick={preparePickedDish} disabled={!validQuantities || loggingDish}
              className="rounded-xl border border-primary-500/60 bg-primary-950/40 px-2 py-3 text-sm font-semibold text-primary-100 transition hover:bg-primary-950/70 disabled:opacity-40">
              Prepara e conserva il resto
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <MacroPill label="Proteine" value={protein} />
            <MacroPill label="Carbo tot." value={carbs} />
            <MacroPill label="Grassi tot." value={fat} />
          </div>
          <ExtendedNutrition totals={extendedTotals} detailedLabels />
        </div>
        <div className="space-y-2">
          <div className="px-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Ingredienti del piatto</p>
            <p className="mt-0.5 text-xs text-gray-500">Le quantità valgono solo per questo inserimento.</p>
          </div>
          {pickingDish.items.map(item => (
            <label key={item.id} className="flex items-center gap-3 rounded-xl border border-gray-700/70 bg-gray-900/30 px-3 py-2 text-sm focus-within:border-primary-500">
              <span className="min-w-0 flex-1 truncate text-gray-300">{item.food_name}</span>
              <input type="number" min="0.1" step="0.1" inputMode="decimal"
                aria-label={`${item.unit === 'ml' ? 'Millilitri' : 'Grammi'} di ${item.food_name}`}
                value={itemQuantities[item.id] ?? formatDecimal(item.quantity_g)}
                onChange={event => setItemQuantities(current => ({ ...current, [item.id]: event.target.value }))}
                onBlur={event => {
                  if (itemQuantities[item.id] === undefined) return
                  const quantity = Number(event.target.value)
                  if (Number.isFinite(quantity) && quantity > 0) setItemQuantities(current => ({ ...current, [item.id]: formatDecimal(quantity) }))
                }}
                onFocus={event => event.currentTarget.select()}
                className="w-16 rounded-lg border border-gray-600 bg-gray-800 px-2 py-1.5 text-right font-semibold outline-none focus:border-primary-500" />
              <span className="w-5 text-xs text-gray-500">{item.unit ?? 'g'}</span>
            </label>
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
        {iconPicker}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2.5">
        <button type="button" onClick={() => setMode('new')}
          className="flex min-h-24 min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border border-amber-400/25 bg-gradient-to-b from-amber-400/10 to-gray-900/60 px-2 py-3 text-center shadow-sm shadow-black/20 transition hover:-translate-y-0.5 hover:border-amber-400/60 hover:bg-amber-400/15 active:translate-y-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/15 text-xl">🍳</span>
          <span className="text-xs font-semibold leading-tight sm:text-sm">Nuova ricetta</span>
        </button>
        <button type="button" onClick={() => setMode('oneoff')}
          className="flex min-h-24 min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border border-violet-400/25 bg-gradient-to-b from-violet-400/10 to-gray-900/60 px-2 py-3 text-center shadow-sm shadow-black/20 transition hover:-translate-y-0.5 hover:border-violet-400/60 hover:bg-violet-400/15 active:translate-y-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400/15 text-xl">✨</span>
          <span className="text-xs font-semibold leading-tight sm:text-sm">Occasionale</span>
        </button>
        <button type="button" onClick={() => setMode('ingredient')}
          className="flex min-h-24 min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border border-emerald-400/25 bg-gradient-to-b from-emerald-400/10 to-gray-900/60 px-2 py-3 text-center shadow-sm shadow-black/20 transition hover:-translate-y-0.5 hover:border-emerald-400/60 hover:bg-emerald-400/15 active:translate-y-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/15 text-xl">🍎</span>
          <span className="text-xs font-semibold leading-tight sm:text-sm">Ingrediente singolo</span>
        </button>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">La tua cucina</p>
            <p className="text-sm font-medium text-gray-300">Piatti salvati e pronti</p>
          </div>
          <span className="rounded-full bg-gray-700 px-2.5 py-1 text-xs text-gray-400">{visibleDishes.length + preparedCount}</span>
        </div>
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          <PreparedDishesPanel mealType={mealType} compact onCountChange={setPreparedCount} onSelect={startPreparedPick} />
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-4">Caricamento...</p>
          ) : visibleDishes.length === 0 && preparedCount === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Nessun piatto salvato per questo pasto.</p>
          ) : visibleDishes.map(dish => (
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
                    <span className="text-xs text-gray-500">{formatDecimal(totalKcal(dish))} kcal · {formatDecimal(referenceWeight(dish))} g</span>
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
      <p className="text-sm font-semibold">{formatDecimal(value)}g</p>
    </div>
  )
}
