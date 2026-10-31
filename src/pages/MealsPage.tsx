import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useSettings } from '../contexts/SettingsContext'
import NutritionSummary from '../components/meals/NutritionSummary'
import PageHeader from '../components/common/PageHeader'
import Icon from '../components/common/Icon'
import MealItemRow from '../components/meals/MealItemRow'
import MealHub, { type MealHubMode } from '../components/meals/MealHub'
import DishEditor, { type DishItemDraft } from '../components/meals/DishEditor'
import MealEntryCard from '../components/meals/MealEntryCard'
import GoodHabits from '../components/meals/GoodHabits'
import ExtendedNutrition from '../components/meals/ExtendedNutrition'
import Modal from '../components/common/Modal'
import DaySelector from '../components/common/DaySelector'
import type { MealEntry, MealType } from '../types'
import { getMealEntryTotals } from '../utils/mealEntries'
import { buildMealTimeline } from '../utils/mealTimeline'
import { getFoodIcon } from '../utils/foodIcons'
import { getExtendedNutritionTotals } from '../utils/extendedNutrition'
import { splitMealItems } from '../utils/mealCustomizations'
import PreparedPortionInput from '../components/meals/PreparedPortionInput'
import SingleIngredientEditor from '../components/meals/SingleIngredientEditor'
import MealPhotoReview from '../components/meals/MealPhotoReview'
import { isMealPhotoEntry } from '../utils/mealPhoto'
import * as api from '../services/api'
import { formatDecimal } from '../utils/decimal'

const MEAL_TYPES: { type: MealType; label: string }[] = [
  { type: 'breakfast', label: '☀️ Colazione' },
  { type: 'lunch',     label: '🍽️ Pranzo' },
  { type: 'dinner',   label: '🌙 Cena' },
  { type: 'snack',    label: '🍎 Spuntino' },
  { type: 'drinks',   label: '🥤 Bevande' },
]

function mealItemToDraft(item: MealEntry['items'][number]): DishItemDraft {
  return {
    dish_item_id: item.dish_item_id ?? null,
    is_customization: item.is_customization ?? false,
    food_name: item.food_name,
    quantity_g: item.quantity_g,
    piece_count: item.piece_count ?? null,
    piece_size: item.piece_size ?? null,
    unit: item.unit,
    calories: item.calories,
    protein_g: item.protein_g,
    carbs_g: item.carbs_g,
    fat_g: item.fat_g,
    fiber_g: item.fiber_g ?? null,
    sugars_g: item.sugars_g ?? null,
    salt_g: item.salt_g ?? null,
    alcohol_abv: item.alcohol_abv ?? null,
    source: item.source,
    off_food_id: item.off_food_id,
    category: item.category,
    food_key: item.food_key,
    pantry_item_id: item.pantry_item_id ?? null,
  }
}

export default function MealsPage() {
  const { user } = useAuth()
  const {
    meals, goals, daySummary, loading, fetchForDate,
    addMealEntry, updateMealEntry, removeMealEntry, showToast,
  } = useData()
  const { selectedDate, setSelectedDate } = useSettings()

  const [foodSearchOpen, setFoodSearchOpen] = useState(false)
  const [activeMealType, setActiveMealType] = useState<MealType>('lunch')
  const [modalStep, setModalStep] = useState<'meal-type' | 'meal-hub' | 'view-entry' | 'edit-entry'>('meal-type')
  const [hubMode, setHubMode] = useState<MealHubMode>('list')
  const [selectedEntry, setSelectedEntry] = useState<MealEntry | null>(null)
  const [preparedAmounts, setPreparedAmounts] = useState<{ total_cooked_g: number; remaining_g: number } | null>(null)
  const [preparedEditG, setPreparedEditG] = useState(0)
  const [savingPreparedEdit, setSavingPreparedEdit] = useState(false)

  function openNewMeal() {
    setModalStep('meal-type')
    setHubMode('list')
    setFoodSearchOpen(true)
  }

  function openEntry(entry: MealEntry, mealType: MealType) {
    setSelectedEntry(entry)
    setActiveMealType(mealType)
    setModalStep('view-entry')
    setFoodSearchOpen(true)
    setPreparedAmounts(null)
    setPreparedEditG(entry.cooked_portion_g ?? 0)
    if (entry.prepared_batch_id) {
      void api.getPreparedBatchAmounts(entry.prepared_batch_id).then(setPreparedAmounts).catch(() => {
        showToast('Errore caricamento preparazione')
      })
    }
  }

  async function handleAddDishEntry(name: string, items: DishItemDraft[], dishId?: string, dishIcon?: string | null) {
    if (!user) return
    try {
      await addMealEntry(activeMealType, name, items, selectedDate, user.id, dishId, dishIcon)
      showToast(activeMealType === 'drinks' ? 'Bevanda registrata' : 'Piatto aggiunto al pasto')
    } catch {
      showToast('Errore aggiunta piatto')
      throw new Error('create failed')
    }
  }

  async function handleUpdateEntry(name: string, items: DishItemDraft[]) {
    if (!selectedEntry) return
    try {
      await updateMealEntry(selectedEntry.id, name, items)
      setFoodSearchOpen(false)
      setSelectedEntry(null)
      showToast('Piatto aggiornato')
    } catch {
      showToast('Errore modifica piatto')
      throw new Error('update failed')
    }
  }

  async function handleDeleteEntry() {
    if (!selectedEntry || !window.confirm(`Eliminare “${selectedEntry.name}” dal diario?`)) return
    try {
      await removeMealEntry(selectedEntry.id)
      setFoodSearchOpen(false)
      setSelectedEntry(null)
      showToast('Piatto eliminato')
    } catch {
      showToast('Errore eliminazione piatto')
    }
  }

  async function handleUpdatePreparedPortion() {
    if (!selectedEntry?.prepared_batch_id || !preparedAmounts || savingPreparedEdit) return
    const available = preparedAmounts.remaining_g + (selectedEntry.cooked_portion_g ?? 0)
    if (!Number.isFinite(preparedEditG) || preparedEditG <= 0 || preparedEditG > available) return
    setSavingPreparedEdit(true)
    try {
      await api.updatePreparedPortion(selectedEntry.id, preparedEditG)
      await fetchForDate(selectedDate)
      setFoodSearchOpen(false)
      setSelectedEntry(null)
      showToast('Porzione aggiornata')
    } catch {
      showToast('Errore modifica porzione')
    } finally {
      setSavingPreparedEdit(false)
    }
  }

  const activeMealLabel = MEAL_TYPES.find(m => m.type === activeMealType)?.label ?? activeMealType
  const mealTimeline = buildMealTimeline(meals)
  const isSingleIngredientEntry = selectedEntry?.items.length === 1
    && !selectedEntry.dish_id && !selectedEntry.prepared_batch_id && !isMealPhotoEntry(selectedEntry)

  return (
    <div className="app-page meals-page">
      <PageHeader title="Pasti" subtitle="Il tuo diario alimentare.">
        <DaySelector date={selectedDate} onChange={setSelectedDate} />
      </PageHeader>
      <NutritionSummary summary={daySummary} goals={goals} />
      <GoodHabits selectedDate={selectedDate} currentMeals={meals} compact />
      <div className="diary-heading">
        <h2 className="section-title">I pasti di oggi</h2>
        <button type="button" className="btn-primary add-meal-button" onClick={openNewMeal}>
          <Icon name="plus" /><span>Aggiungi pasto</span>
        </button>
      </div>

      {/* Meal section — single card */}
      {loading ? (
        <div className="h-32 bg-gray-800 rounded-xl animate-pulse" />
      ) : (
        <div className="meal-diary">
          {mealTimeline.length === 0 ? (
            <div className="py-7 text-center">
              <Icon name="meals" className="mx-auto h-9 w-9 text-gray-500" />
              <p className="mt-2 text-sm font-medium text-gray-400">Nessun piatto registrato</p>
              <p className="mt-1 text-xs text-gray-600">Aggiungi ciò che hai mangiato in questa giornata</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mealTimeline.map(({ type, entries }) => {
                const label = MEAL_TYPES.find(mealType => mealType.type === type)?.label ?? type
                const total = entries.reduce((sum, entry) =>
                  sum + entry.items.reduce((itemSum, item) => itemSum + item.calories, 0), 0)
                return (
                  <div key={entries[0].id}>
                    <div className="meal-group-heading">
                      <h3>{label.replace(/^\S+\s/, '')}</h3>
                      <span>{formatDecimal(total, 0)} kcal</span>
                    </div>
                    <div>
                      {entries.map(entry => (
                        <MealEntryCard key={entry.id} entry={entry} onOpen={() => openEntry(entry, type)} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <details className="extra-nutrients">
        <summary>Nutrienti extra</summary>
        <ExtendedNutrition totals={getExtendedNutritionTotals(meals.flatMap(meal => meal.entries.flatMap(entry => entry.items)))} />
      </details>

      {/* Meal modal */}
      <Modal open={foodSearchOpen} onClose={() => setFoodSearchOpen(false)}>
        {modalStep === 'meal-type' ? (
          <div className="space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-400">Nuova registrazione</p>
                <h2 className="mt-1 text-2xl font-bold">Quando l'hai mangiato?</h2>
                <p className="mt-1 text-sm text-gray-500">Scegli il momento della giornata.</p>
              </div>
              <button type="button" onClick={() => setFoodSearchOpen(false)} className="text-gray-400 text-xl" aria-label="Chiudi">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {MEAL_TYPES.map(({ type, label }, index) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setActiveMealType(type); setHubMode('list'); setModalStep('meal-hub') }}
                  className={`rounded-2xl border border-gray-700 bg-gray-900/35 px-3 py-5 text-center font-medium transition hover:border-primary-600 hover:bg-primary-950/20 ${index === MEAL_TYPES.length - 1 ? 'col-span-2' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : modalStep === 'meal-hub' ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => {
                  if (hubMode === 'list') setModalStep('meal-type')
                  else if (hubMode === 'oneoff-manual' || hubMode === 'ingredient' || hubMode === 'new') setHubMode('ingredients')
                  else setHubMode('list')
                }} className="text-gray-400 text-lg leading-none" aria-label="Indietro">←</button>
                <span className="text-sm font-medium text-gray-300">{activeMealLabel}</span>
              </div>
              <button
                type="button"
                onClick={() => setFoodSearchOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-xl text-gray-400 hover:bg-gray-700"
                aria-label="Chiudi"
              >
                ✕
              </button>
            </div>
            <MealHub onAddEntry={handleAddDishEntry} onDishUpdated={() => fetchForDate(selectedDate)}
              onPrepared={() => fetchForDate(selectedDate)} date={selectedDate}
              beveragesOnly={activeMealType === 'drinks'} mealType={activeMealType === 'drinks' ? 'lunch' : activeMealType}
              mode={hubMode} setMode={setHubMode} />
          </div>
        ) : modalStep === 'view-entry' ? (
          selectedEntry && (() => {
            const totals = getMealEntryTotals(selectedEntry)
            const extendedTotals = getExtendedNutritionTotals(selectedEntry.items)
            const hasSavedRecipe = Boolean(selectedEntry.dish_id) || selectedEntry.items.some(item => item.is_customization)
            const { baseItems, addedItems } = splitMealItems(selectedEntry.items)
            const ingredientSections = hasSavedRecipe
              ? [{ label: 'Ricetta base', items: baseItems }, { label: 'Ingredienti aggiunti', items: addedItems }]
              : [{ label: 'Ingredienti', items: selectedEntry.items }]
            return (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setFoodSearchOpen(false)} className="text-sm text-gray-400">← Chiudi</button>
                  <span className="rounded-full bg-gray-700 px-3 py-1 text-xs text-gray-300">{activeMealLabel}</span>
                </div>
                <div className="rounded-xl border border-gray-700 bg-gray-900 p-5 ring-1 ring-primary-500/20">
                  <div className="mb-4 flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/15 text-3xl">{selectedEntry.dish_icon || getFoodIcon(selectedEntry.items)}</div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-bold text-white">{selectedEntry.name}</h2>
                      {isMealPhotoEntry(selectedEntry) && <p className="mt-1 text-xs text-primary-300">📸 Stimato da foto</p>}
                      <p className="mt-1 text-sm text-gray-400">
                        {selectedEntry.cooked_portion_g != null
                          ? `${formatDecimal(selectedEntry.cooked_portion_g)} g da cotto`
                          : `${formatDecimal(totals.weight)} g${totals.volumeMl > 0 ? ` + ${formatDecimal(totals.volumeMl)} ml` : ''}`} · {selectedEntry.items.length} elementi
                      </p>
                    </div>
                    <span className="text-xl font-bold text-primary-400">{formatDecimal(totals.calories)}<small className="ml-1 text-[10px] font-medium">kcal</small></span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-black/15 p-2 text-center"><p className="text-xs text-gray-500">Proteine</p><p className="font-semibold">{formatDecimal(totals.protein)}g</p></div>
                    <div className="rounded-xl bg-black/15 p-2 text-center"><p className="text-xs text-gray-500">Carboidrati</p><p className="font-semibold">{formatDecimal(totals.carbs)}g</p></div>
                    <div className="rounded-xl bg-black/15 p-2 text-center"><p className="text-xs text-gray-500">Grassi</p><p className="font-semibold">{formatDecimal(totals.fat)}g</p></div>
                  </div>
                  <ExtendedNutrition totals={extendedTotals} />
                </div>
                {isMealPhotoEntry(selectedEntry) ? <details className="rounded-2xl border border-gray-700 bg-gray-900/40 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-200">Ingredienti e quantità · {selectedEntry.items.length}</summary>
                  <p className="mt-3 text-xs text-gray-400">Ingredienti, quantità e valori nutrizionali stimati dalla foto, con le eventuali correzioni apportate.</p>
                  <div className="mt-2">{selectedEntry.items.map(item => <MealItemRow key={item.id} item={item} />)}</div>
                </details> : ingredientSections.filter(section => section.items.length > 0).map(section => (
                  <div key={section.label}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{section.label}</p>
                    <div className="rounded-2xl bg-gray-900/40 px-4">
                      {section.items.map(item => <MealItemRow key={item.id} item={item} />)}
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <button type="button" onClick={() => setModalStep('edit-entry')} className="btn-primary py-3">
                    {isSingleIngredientEntry ? 'Modifica quantità' : 'Modifica piatto'}
                  </button>
                  <button type="button" onClick={handleDeleteEntry} className="rounded-xl border border-red-900 px-4 text-red-400 hover:bg-red-950/30" aria-label="Elimina piatto">🗑️</button>
                </div>
              </div>
            )
          })()
        ) : (
          selectedEntry && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs uppercase tracking-wider text-primary-400">Modifica</p>
                  <h2 className="text-lg font-semibold">{selectedEntry.name}</h2>
                </div>
                <button type="button" onClick={() => setFoodSearchOpen(false)} className="text-gray-400 text-xl" aria-label="Chiudi">✕</button>
              </div>
              {selectedEntry.prepared_batch_id ? (
                preparedAmounts ? <div className="space-y-4">
                  <PreparedPortionInput
                    totalCookedG={preparedAmounts.total_cooked_g}
                    remainingG={preparedAmounts.remaining_g + (selectedEntry.cooked_portion_g ?? 0)}
                    value={preparedEditG} onChange={setPreparedEditG} />
                  <button type="button" onClick={() => void handleUpdatePreparedPortion()}
                    disabled={savingPreparedEdit || preparedEditG <= 0 || preparedEditG > preparedAmounts.remaining_g + (selectedEntry.cooked_portion_g ?? 0)}
                    className="w-full rounded-xl bg-primary-500 py-3 font-semibold disabled:opacity-40">Salva porzione</button>
                </div> : <p className="text-sm text-gray-500">Caricamento preparazione…</p>
              ) : isMealPhotoEntry(selectedEntry) ? <MealPhotoReview
                key={selectedEntry.id} editing initialName={selectedEntry.name}
                initialItems={selectedEntry.items.map(mealItemToDraft)}
                onSave={handleUpdateEntry} onCancel={() => setModalStep('view-entry')}
              /> : isSingleIngredientEntry ? <SingleIngredientEditor
                key={selectedEntry.id}
                item={mealItemToDraft(selectedEntry.items[0])}
                onSave={item => handleUpdateEntry(selectedEntry.name, [item])}
                onCancel={() => setModalStep('view-entry')}
              /> : <DishEditor
                initialName={selectedEntry.name}
                initialItems={selectedEntry.items.map(mealItemToDraft)}
                showMealTypes={false}
                editing
                separateCustomizations={Boolean(selectedEntry.dish_id) || selectedEntry.items.some(item => item.is_customization)}
                onSave={handleUpdateEntry}
                onCancel={() => setModalStep('view-entry')}
                saveLabel="Salva modifiche"
              />}
            </div>
          )
        )}
      </Modal>
    </div>
  )
}
