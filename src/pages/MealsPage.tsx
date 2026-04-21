import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useSettings } from '../contexts/SettingsContext'
import CalorieRing from '../components/meals/CalorieRing'
import MacroBars from '../components/meals/MacroBars'
import MealItemRow from '../components/meals/MealItemRow'
import FoodSearch from '../components/meals/FoodSearch'
import Modal from '../components/common/Modal'
import DaySelector from '../components/common/DaySelector'
import type { MealType } from '../types'

const MEAL_TYPES: { type: MealType; label: string }[] = [
  { type: 'breakfast', label: '☀️ Colazione' },
  { type: 'lunch',     label: '🍽️ Pranzo' },
  { type: 'dinner',   label: '🌙 Cena' },
  { type: 'snack',    label: '🍎 Spuntino' },
]

export default function MealsPage() {
  const { user } = useAuth()
  const { meals, workouts, goals, daySummary, loading, fetchForDate, addMealItem, removeMealItem } = useData()
  const { selectedDate, setSelectedDate } = useSettings()

  const [foodSearchOpen, setFoodSearchOpen] = useState(false)
  const [activeMealType, setActiveMealType] = useState<MealType>('lunch')
  const [modalStep, setModalStep] = useState<'meal-type' | 'food-search'>('meal-type')
  const [foodAddKey, setFoodAddKey] = useState(0)

  useEffect(() => {
    fetchForDate(selectedDate)
  }, [selectedDate, fetchForDate])

  const totalBurned = workouts.reduce((s, w) => s + w.calories_burned, 0)
  const target = goals?.calorie_target ?? 2000
  const remaining = target + totalBurned - daySummary.calories
  const isOver = remaining < 0

  function openNewMeal() {
    setModalStep('meal-type')
    setFoodAddKey(k => k + 1)
    setFoodSearchOpen(true)
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
      <div
        className="bg-gray-800 rounded-xl px-4 py-5 flex items-center justify-center border-2 border-dashed border-gray-700 cursor-pointer select-none"
        onClick={openNewMeal}
      >
        <div className="w-10 h-10 rounded-full border-2 border-gray-600 flex items-center justify-center text-gray-400 font-bold text-2xl">+</div>
      </div>

      {/* Meal section — single card */}
      {loading ? (
        <div className="h-32 bg-gray-800 rounded-xl animate-pulse" />
      ) : (
        <div className="card">
          {MEAL_TYPES.every(({ type }) => !(meals.find(m => m.meal_type === type)?.items.length)) ? (
            <p className="text-sm text-gray-600 text-center py-4">Nessun alimento inserito nel giorno selezionato</p>
          ) : (
            <div className="space-y-4">
              {MEAL_TYPES.filter(({ type }) => (meals.find(m => m.meal_type === type)?.items ?? []).length > 0).map(({ type, label }) => {
                const meal = meals.find(m => m.meal_type === type)
                const items = meal?.items ?? []
                const total = items.reduce((s, i) => s + i.calories, 0)
                return (
                  <div key={type}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-gray-400">{label}</span>
                      <span className="text-xs text-gray-600">{Math.round(total)} kcal</span>
                    </div>
                    {items.map(item => (
                      <MealItemRow
                        key={item.id}
                        item={item}
                        onDelete={() => meal && removeMealItem(item.id, meal.id)}
                      />
                    ))}
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
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Quale pasto?</h2>
              <button type="button" onClick={() => setFoodSearchOpen(false)} className="text-gray-400 text-xl" aria-label="Chiudi">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {MEAL_TYPES.map(({ type, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setActiveMealType(type); setModalStep('food-search') }}
                  className="py-5 rounded-xl bg-gray-700 hover:bg-gray-600 font-medium text-center transition-colors text-base"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setModalStep('meal-type')} className="text-gray-400 text-lg leading-none">←</button>
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
            <FoodSearch
              key={foodAddKey}
              hideHeader
              mealType={activeMealType}
              onClose={() => setFoodSearchOpen(false)}
              onAdd={async (item) => {
                if (!user) return
                await addMealItem(activeMealType, { ...item, meal_id: '' }, selectedDate, user.id)
                setFoodAddKey(k => k + 1)
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}
