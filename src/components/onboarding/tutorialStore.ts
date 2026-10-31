import type { DataContextType } from '../../contexts/DataContext'
import type { Dish, DishItemDraft, GymPlan, Meal, MealEntry, MealItemInput, PantryItem, PreparedBatch, WeightLog, Workout } from '../../types'
import { DEMO_USER, exampleDish, exampleGoals, exampleIngredient, examplePhoto, examplePlan, exampleProfile } from './tutorialExamples'
import { scaleIngredient, nutritionTotals } from '../../utils/nutrition'
import { searchBasicFoods, calcNutrition } from '../../services/nutrition'
import type { TutorialEnvironmentValue } from '../../contexts/TutorialEnvironment'

type Api = typeof import('../../services/api')
type GymApi = typeof import('../../services/gymApi')

interface Snapshot {
  pantry: PantryItem[]
  dishes: Dish[]
  batches: PreparedBatch[]
  meals: Meal[]
  workouts: Workout[]
  weights: WeightLog[]
  plans: GymPlan[]
  revision: number
  action: string
  toast: string | null
}

// A missing demo operation fails closed. It never falls back to a live service.
function isolatedService<T extends object>(handlers: Partial<T>): T {
  return new Proxy(handlers as T, {
    get(target, key) {
      if (key in target) return Reflect.get(target, key)
      return () => Promise.reject(new Error('Questa azione non fa parte della dimostrazione.'))
    },
  })
}

export function createTutorialStore(date: string) {
  let snapshot: Snapshot = { pantry: [], dishes: [], batches: [], meals: [], workouts: [], weights: [], plans: [], revision: 0, action: '', toast: null }
  const listeners = new Set<() => void>()
  const now = `${date}T12:00:00Z`
  const notify = (patch: Partial<Snapshot>, action = snapshot.action) => {
    snapshot = { ...snapshot, ...patch, action, revision: snapshot.revision + 1 }
    listeners.forEach(listener => listener())
  }
  const noop = async () => {}

  function dish(name: string, items: DishItemDraft[], mealTypes: Dish['meal_types']): Dish {
    return { ...exampleDish, name, meal_types: [...mealTypes], items: items.map((item, position) => ({
      ...item, id: `tutorial-dish-item-${position}`, dish_id: exampleDish.id, position, created_at: now,
    })) }
  }

  function addEntry(entryDate: string, mealType: Meal['meal_type'], name: string, items: MealItemInput[], dishId: string | null = null,
    batchId: string | null = null, cookedPortion: number | null = null) {
    const id = `tutorial-entry-${batchId ?? (items.some(item => item.source === 'ai_meal_photo') ? 'photo' : 'ingredient')}`
    const mealId = `tutorial-meal-${entryDate}-${mealType}`
    const meal = snapshot.meals.find(item => item.id === mealId) ?? {
      id: mealId, user_id: DEMO_USER, date: entryDate, meal_type: mealType, name: null, created_at: now, entries: [],
    }
    const entry: MealEntry = { id, meal_id: mealId, name, dish_id: dishId, prepared_batch_id: batchId,
      cooked_portion_g: cookedPortion, created_at: now,
      items: items.map((item, position) => ({ ...item, id: `${id}-${position}`, meal_id: mealId,
        entry_id: id, unit: item.unit ?? 'g', created_at: now })),
    }
    const nextMeal = { ...meal, entries: [...meal.entries.filter(item => item.id !== id), entry] }
    notify({ meals: [...snapshot.meals.filter(item => item.id !== mealId), nextMeal] })
    return { meal: nextMeal, entry }
  }

  const api = isolatedService<Api>({
    getPantryItems: async () => snapshot.pantry,
    addPantryItem: async item => {
      const saved = { ...item, id: 'tutorial-ingredient', user_id: DEMO_USER, created_at: now }
      notify({ pantry: [saved], toast: 'Ingrediente di esempio salvato' }, 'ingredient-saved')
      return saved
    },
    getDishes: async () => snapshot.dishes,
    createDish: async (_userId, name, items, mealTypes) => {
      const saved = dish(name, items, mealTypes)
      notify({ dishes: [saved], toast: 'Piatto di esempio salvato' }, 'dish-saved')
      return saved
    },
    updateDishCookingPreference: noop,
    getPreparedBatches: async () => snapshot.batches.filter(batch => !batch.closed_at && batch.remaining_g > 0),
    getPreparedBatchAmounts: async id => {
      const batch = snapshot.batches.find(item => item.id === id)
      if (!batch) throw new Error('Preparazione non disponibile')
      return { total_cooked_g: batch.total_cooked_g, remaining_g: batch.remaining_g }
    },
    createPreparedBatch: async args => {
      const recipe = dish(args.name, args.items, ['lunch', 'dinner'])
      const batch: PreparedBatch = { id: 'tutorial-batch', user_id: DEMO_USER, snapshot_dish_id: recipe.id,
        source_dish_id: args.sourceDishId, total_cooked_g: args.totalCookedG,
        remaining_g: args.totalCookedG - args.firstPortionG, closed_at: null, created_at: now, dish: recipe }
      notify({ batches: [batch], meals: snapshot.meals.map(meal => ({ ...meal,
        entries: meal.entries.filter(entry => entry.prepared_batch_id !== batch.id),
      })).filter(meal => meal.entries.length > 0) })
      if (args.firstPortionG > 0) {
        addEntry(args.date, args.mealType, args.name, args.items.map(item => scaleIngredient(item, item.quantity_g * args.firstPortionG / args.totalCookedG)),
          recipe.id, batch.id, args.firstPortionG)
      }
      notify({ toast: 'Preparazione di esempio conservata' }, 'preparation-saved')
    },
    consumePreparedBatch: async (id, entryDate, mealType, grams) => {
      const batch = snapshot.batches.find(item => item.id === id)
      if (!batch || grams <= 0 || grams > batch.remaining_g) throw new Error('Porzione non disponibile')
      const previousPortion = snapshot.meals.flatMap(meal => meal.entries).find(entry => entry.prepared_batch_id === id)?.cooked_portion_g ?? 0
      const available = batch.remaining_g + previousPortion
      addEntry(entryDate, mealType, batch.dish.name, batch.dish.items.map(item => scaleIngredient(item, item.quantity_g * grams / batch.total_cooked_g)), batch.dish.id, id, grams)
      notify({ batches: snapshot.batches.map(item => item.id === id ? { ...item, remaining_g: available - grams } : item),
        toast: 'Porzione di esempio registrata' }, 'portion-saved')
    },
    addMealEntry: async (_userId, entryDate, mealType, name, items, dishId) => {
      const result = addEntry(entryDate, mealType, name, items, dishId)
      notify({ toast: 'Pasto di esempio registrato' }, 'meal-saved')
      return result
    },
    getWeightLogs: async (from, to) => snapshot.weights.filter(log => log.date >= from && log.date <= to),
    getLatestWeightLog: async to => snapshot.weights.filter(log => log.date <= to).at(-1) ?? null,
    upsertWeightLog: async log => {
      const saved = { ...log, user_id: DEMO_USER, id: 'tutorial-weight', created_at: now }
      notify({ weights: [saved], toast: 'Pesata di esempio registrata' }, 'weight-saved')
      return saved
    },
    getMealsForDate: async entryDate => snapshot.meals.filter(meal => meal.date === entryDate),
    getMealsForRange: async (from, to) => snapshot.meals.filter(meal => meal.date >= from && meal.date <= to),
    getWorkoutsForDate: async entryDate => snapshot.workouts.filter(workout => workout.date === entryDate),
    addWorkout: async workout => {
      const saved = { ...workout, user_id: DEMO_USER, id: 'tutorial-workout', created_at: now }
      notify({ workouts: [saved], toast: 'Attività di esempio registrata' }, 'activity-saved')
      return saved
    },
  })

  const gym = isolatedService<GymApi>({
    getGymPlans: async () => snapshot.plans,
    getGymTrainingSessions: async () => [],
    getCustomGymExercises: async () => [],
    saveGymPlan: async (_userId, _planId, name, exercises) => {
      const plan: GymPlan = { ...examplePlan, name, exercises: exercises.map((exercise, position) => ({
        ...exercise, id: `tutorial-exercise-${position}`, plan_id: examplePlan.id, position,
      })) }
      notify({ plans: [plan], toast: 'Scheda di esempio salvata' }, 'plan-saved')
      return plan.id
    },
  })

  const services: TutorialEnvironmentValue['services'] = {
    api, gym,
    nutrition: isolatedService<typeof import('../../services/nutrition')>({ searchBasicFoods,
      searchFood: async query => searchBasicFoods(query), calcNutrition }),
  }

  const initialBatch = (): PreparedBatch => ({ id: 'tutorial-batch', user_id: DEMO_USER,
    snapshot_dish_id: exampleDish.id, source_dish_id: exampleDish.id, total_cooked_g: 750, remaining_g: 750,
    closed_at: null, created_at: now, dish: snapshot.dishes[0] ?? exampleDish })

  return {
    services,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    getSnapshot: () => snapshot,
    ensureScene(scene: string) {
      if (['meal-hub', 'dish-pick', 'dish-prepare', 'prepared-list', 'prepared-pick'].includes(scene) && snapshot.dishes.length === 0) {
        notify({ dishes: [exampleDish] })
      }
      if (['prepared-list', 'prepared-pick'].includes(scene) && !snapshot.batches.some(batch => batch.remaining_g > 0)) {
        notify({ batches: [initialBatch()] })
      }
    },
    examples() {
      const recipe = snapshot.dishes[0] ?? exampleDish
      return { ingredient: exampleIngredient, dish: recipe, dishItems: recipe.items,
        plan: snapshot.plans[0] ?? examplePlan, photo: examplePhoto, batch: snapshot.batches[0] ?? initialBatch() }
    },
    data(): DataContextType {
      const totals = nutritionTotals(snapshot.meals.flatMap(meal => meal.entries.flatMap(entry => entry.items)))
      return {
        profile: exampleProfile, profileStatus: 'ready', profileUserId: DEMO_USER, goals: exampleGoals,
        currentWeightKg: snapshot.weights.at(-1)?.weight_kg ?? exampleProfile.weight_kg,
        rollingWeightKg: null, rollingWeightSampleCount: 0, meals: snapshot.meals, workouts: snapshot.workouts,
        loading: false, toast: snapshot.toast, mealRevision: snapshot.revision,
        daySummary: { calories: totals.calories, protein_g: totals.protein, carbs_g: totals.carbs,
          fat_g: totals.fat, calories_burned: snapshot.workouts.reduce((sum, workout) => sum + workout.calories_burned, 0) },
        fetchForDate: noop, refreshDiary: noop, fetchProfile: noop, refreshCurrentWeight: noop,
        completeOnboarding: async () => { throw new Error('Onboarding non disponibile nella demo') },
        dismissTutorial: noop, saveGoals: noop,
        saveProfileAndRecalculate: async () => exampleGoals,
        addMealEntry: async (mealType, name, items, entryDate, userId, dishId) => { await api.addMealEntry(userId, entryDate, mealType, name, items, dishId) },
        updateMealEntry: async () => { throw new Error('Modifica non disponibile nella demo') },
        removeMealEntry: async () => { throw new Error('Eliminazione non disponibile nella demo') },
        setDishIcon: () => {}, addWorkout: async workout => { await api.addWorkout(workout) },
        removeWorkout: async () => { throw new Error('Eliminazione non disponibile nella demo') },
        getWeeklyMeals: api.getMealsForRange,
        showToast: () => {},
      }
    },
  }
}
