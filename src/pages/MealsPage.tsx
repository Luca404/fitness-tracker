import { useEffect, useState } from 'react'
import { format, addDays, subDays, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useSettings } from '../contexts/SettingsContext'
import CalorieRing from '../components/meals/CalorieRing'
import MacroBars from '../components/meals/MacroBars'
import MealSection from '../components/meals/MealSection'
import FoodSearch from '../components/meals/FoodSearch'
import Modal from '../components/common/Modal'
import type { MealType } from '../types'

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export default function MealsPage() {
  const { user } = useAuth()
  const { meals, workouts, goals, daySummary, loading, fetchForDate, addMealItem, removeMealItem } = useData()
  const { selectedDate, setSelectedDate } = useSettings()

  const [foodSearchOpen, setFoodSearchOpen] = useState(false)
  const [activeMealType, setActiveMealType] = useState<MealType>('lunch')

  useEffect(() => {
    fetchForDate(selectedDate)
  }, [selectedDate, fetchForDate])

  const totalBurned = workouts.reduce((s, w) => s + w.calories_burned, 0)

  const sortedMeals = [...meals].sort(
    (a, b) => MEAL_ORDER.indexOf(a.meal_type as MealType) - MEAL_ORDER.indexOf(b.meal_type as MealType)
  )

  function openFoodSearch(mealType: string) {
    setActiveMealType(mealType as MealType)
    setFoodSearchOpen(true)
  }

  const dateLabel = format(parseISO(selectedDate), 'EEEE d MMMM', { locale: it })

  return (
    <div className="p-4 space-y-6">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setSelectedDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
          className="text-gray-400 text-2xl px-2"
          aria-label="Giorno precedente"
        >
          ‹
        </button>
        <span className="capitalize text-sm font-medium text-gray-300">{dateLabel}</span>
        <button
          type="button"
          onClick={() => setSelectedDate(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
          className="text-gray-400 text-2xl px-2"
          aria-label="Giorno successivo"
        >
          ›
        </button>
      </div>

      {/* Calorie ring */}
      <div className="flex justify-center">
        <CalorieRing consumed={daySummary.calories} target={goals?.calorie_target ?? 2000} />
      </div>

      {/* Macro bars */}
      {goals && (
        <MacroBars
          protein={daySummary.protein_g}
          carbs={daySummary.carbs_g}
          fat={daySummary.fat_g}
          targets={{ protein_g: goals.protein_g, carbs_g: goals.carbs_g, fat_g: goals.fat_g }}
        />
      )}

      {/* Calories burned */}
      {totalBurned > 0 && (
        <div className="flex justify-between items-center text-sm bg-gray-800 rounded-lg px-4 py-2">
          <span className="text-gray-400">🔥 Calorie bruciate</span>
          <span className="text-orange-400 font-medium">{Math.round(totalBurned)} kcal</span>
        </div>
      )}

      {/* Meal sections */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div>
          {sortedMeals.length > 0
            ? sortedMeals.map(meal => (
                <MealSection
                  key={meal.id}
                  meal={meal}
                  onDeleteItem={itemId => removeMealItem(itemId, meal.id)}
                  onAddItem={openFoodSearch}
                />
              ))
            : <p className="text-gray-500 text-sm text-center py-4">Nessun pasto registrato</p>
          }
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={() => openFoodSearch('lunch')}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-emerald-500 text-white text-2xl shadow-lg flex items-center justify-center"
        aria-label="Aggiungi alimento"
      >
        +
      </button>

      {/* Food search modal */}
      <Modal open={foodSearchOpen} onClose={() => setFoodSearchOpen(false)}>
        <FoodSearch
          mealType={activeMealType}
          onClose={() => setFoodSearchOpen(false)}
          onAdd={async (item) => {
            if (!user) return
            await addMealItem(activeMealType, {
              ...item,
              meal_id: '',
            }, selectedDate, user.id)
            setFoodSearchOpen(false)
          }}
        />
      </Modal>
    </div>
  )
}
