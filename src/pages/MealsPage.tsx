import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useSettings } from '../contexts/SettingsContext'
import CalorieRing from '../components/meals/CalorieRing'
import MacroBars from '../components/meals/MacroBars'
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
import { getFoodIcon } from '../utils/foodIcons'
import { getExtendedNutritionTotals } from '../utils/extendedNutrition'

const MEAL_TYPES: { type: MealType; label: string }[] = [
  { type: 'breakfast', label: '☀️ Colazione' },
  { type: 'lunch',     label: '🍽️ Pranzo' },
  { type: 'dinner',   label: '🌙 Cena' },
  { type: 'snack',    label: '🍎 Spuntino' },
  { type: 'drinks',   label: '🥤 Bevande' },
]

function mealItemToDraft(item: MealEntry['items'][number]): DishItemDraft {
  return {
    food_name: item.food_name,
    quantity_g: item.quantity_g,
    unit: item.unit,
    calories: item.calories,
    protein_g: item.protein_g,
    carbs_g: item.carbs_g,
    fat_g: item.fat_g,
    fiber_g: item.fiber_g ?? null,
    sugars_g: item.sugars_g ?? null,
    salt_g: item.salt_g ?? null,
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
    meals, workouts, goals, daySummary, loading, fetchForDate,
    addMealEntry, updateMealEntry, removeMealEntry, showToast,
  } = useData()
  const { selectedDate, setSelectedDate } = useSettings()

  const [foodSearchOpen, setFoodSearchOpen] = useState(false)
  const [activeMealType, setActiveMealType] = useState<MealType>('lunch')
  const [modalStep, setModalStep] = useState<'meal-type' | 'meal-hub' | 'view-entry' | 'edit-entry'>('meal-type')
  const [hubMode, setHubMode] = useState<MealHubMode>('list')
  const [selectedEntry, setSelectedEntry] = useState<MealEntry | null>(null)

  useEffect(() => {
    fetchForDate(selectedDate)
  }, [selectedDate, fetchForDate])

  const totalBurned = workouts.reduce((s, w) => s + w.calories_burned, 0)
  const target = goals?.calorie_target ?? 2000
  // The target already derives from an activity-adjusted TDEE. Workouts remain
  // informational here so exercise is not counted twice in the daily budget.
  const remaining = target - daySummary.calories
  const isOver = remaining < 0

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
  }

  async function handleAddDishEntry(name: string, items: DishItemDraft[]) {
    if (!user) return
    try {
      await addMealEntry(activeMealType, name, items, selectedDate, user.id)
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

  const activeMealLabel = MEAL_TYPES.find(m => m.type === activeMealType)?.label ?? activeMealType

  return (
    <div className="p-4 pb-24 space-y-4">
      <DaySelector date={selectedDate} onChange={setSelectedDate} />

      {/* Summary card: ring + stats */}
      <div className="card flex items-center gap-5">
        <CalorieRing consumed={daySummary.calories} target={target} />
        <div className="flex-1 space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Consumate</span>
            <span className="font-semibold">{Math.round(daySummary.calories)} kcal</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Obiettivo</span>
            <span className="font-semibold">{target} kcal</span>
          </div>
          {totalBurned > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">🔥 Bruciate</span>
              <span className="text-orange-400 font-semibold">{Math.round(totalBurned)} kcal</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-700 pt-2">
            <span className="text-gray-400">Rimanenti</span>
            <span className={`font-bold ${isOver ? 'text-orange-400' : 'text-primary-400'}`}>
              {isOver ? `+${Math.abs(Math.round(remaining))}` : Math.round(remaining)} kcal
            </span>
          </div>
        </div>
      </div>

      <GoodHabits selectedDate={selectedDate} currentMeals={meals} compact />

      {/* Macro bars */}
      {goals && (
        <div className="card">
          <MacroBars
            protein={daySummary.protein_g}
            carbs={daySummary.carbs_g}
            fat={daySummary.fat_g}
            targets={{ protein_g: goals.protein_g, carbs_g: goals.carbs_g, fat_g: goals.fat_g }}
          />
        </div>
      )}

      {/* Add meal button */}
      <button
        type="button"
        className="group flex w-full select-none items-center gap-3 rounded-2xl border border-primary-500/25 bg-gradient-to-r from-primary-600/15 to-emerald-400/5 px-4 py-4 text-left transition hover:border-primary-500/50"
        onClick={openNewMeal}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-500 text-2xl font-light text-white shadow-lg shadow-primary-900/30">+</div>
        <div className="flex-1">
          <p className="font-semibold">Registra ciò che hai consumato</p>
          <p className="text-xs text-gray-400">Piatto salvato, nuovo oppure bevanda</p>
        </div>
        <span className="text-gray-600 transition group-hover:translate-x-0.5 group-hover:text-primary-400">→</span>
      </button>

      {/* Meal section — single card */}
      {loading ? (
        <div className="h-32 bg-gray-800 rounded-xl animate-pulse" />
      ) : (
        <div className="card">
          {MEAL_TYPES.every(({ type }) => !(meals.find(m => m.meal_type === type)?.entries.length)) ? (
            <div className="py-7 text-center">
              <span className="text-3xl">🍽️</span>
              <p className="mt-2 text-sm font-medium text-gray-400">Nessun piatto registrato</p>
              <p className="mt-1 text-xs text-gray-600">Aggiungi ciò che hai mangiato in questa giornata</p>
            </div>
          ) : (
            <div className="space-y-4">
              {MEAL_TYPES.filter(({ type }) => (meals.find(m => m.meal_type === type)?.entries ?? []).length > 0).map(({ type, label }) => {
                const meal = meals.find(m => m.meal_type === type)
                const items = meal?.items ?? []
                const total = items.reduce((s, i) => s + i.calories, 0)
                return (
                  <div key={type}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-gray-400">{label}</span>
                      <span className="text-xs text-gray-600">{Math.round(total)} kcal</span>
                    </div>
                    <div className="space-y-2">
                      {meal?.entries.map(entry => (
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
                  else setHubMode('list')
                }} className="text-gray-400 text-lg leading-none" aria-label="Indietro">←</button>
                <span className="text-sm font-medium text-gray-300">{activeMealLabel}</span>
              </div>
              <button
                type="button"
                onClick={() => setFoodSearchOpen(false)}
                className="px-4 py-1.5 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm font-medium transition-colors"
              >
                Fatto
              </button>
            </div>
            <MealHub onAddEntry={handleAddDishEntry} beveragesOnly={activeMealType === 'drinks'} mode={hubMode} setMode={setHubMode} />
          </div>
        ) : modalStep === 'view-entry' ? (
          selectedEntry && (() => {
            const totals = getMealEntryTotals(selectedEntry)
            const extendedTotals = getExtendedNutritionTotals(selectedEntry.items)
            return (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setFoodSearchOpen(false)} className="text-sm text-gray-400">← Chiudi</button>
                  <span className="rounded-full bg-gray-700 px-3 py-1 text-xs text-gray-300">{activeMealLabel}</span>
                </div>
                <div className="rounded-3xl bg-gradient-to-br from-primary-600/25 via-gray-800 to-gray-800 p-5 ring-1 ring-primary-500/20">
                  <div className="mb-4 flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/15 text-3xl">{getFoodIcon(selectedEntry.items)}</div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-bold text-white">{selectedEntry.name}</h2>
                      <p className="mt-1 text-sm text-gray-400">
                        {Math.round(totals.weight)} g{totals.volumeMl > 0 ? ` + ${Math.round(totals.volumeMl)} ml` : ''} · {selectedEntry.items.length} elementi
                      </p>
                    </div>
                    <span className="text-xl font-bold text-primary-400">{Math.round(totals.calories)}<small className="ml-1 text-[10px] font-medium">kcal</small></span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-black/15 p-2 text-center"><p className="text-xs text-gray-500">Proteine</p><p className="font-semibold">{Math.round(totals.protein)}g</p></div>
                    <div className="rounded-xl bg-black/15 p-2 text-center"><p className="text-xs text-gray-500">Carbo</p><p className="font-semibold">{Math.round(totals.carbs)}g</p></div>
                    <div className="rounded-xl bg-black/15 p-2 text-center"><p className="text-xs text-gray-500">Grassi</p><p className="font-semibold">{Math.round(totals.fat)}g</p></div>
                  </div>
                  <ExtendedNutrition totals={extendedTotals} />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Ingredienti</p>
                  <div className="rounded-2xl bg-gray-900/40 px-4">
                    {selectedEntry.items.map(item => <MealItemRow key={item.id} item={item} />)}
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <button type="button" onClick={() => setModalStep('edit-entry')} className="btn-primary py-3">Modifica piatto</button>
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
              <DishEditor
                initialName={selectedEntry.name}
                initialItems={selectedEntry.items.map(mealItemToDraft)}
                onSave={handleUpdateEntry}
                onCancel={() => setModalStep('view-entry')}
                saveLabel="Salva modifiche"
              />
            </div>
          )
        )}
      </Modal>
    </div>
  )
}
