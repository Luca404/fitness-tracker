import type { Dish, DishItemDraft, GymPlan, UserGoals, UserHealthProfile } from '../../types'
import type { PendingFood } from '../../utils/pantryDraft'
import type { MealPhotoAnalysis } from '../../services/mealPhoto'

export const DEMO_USER = 'tutorial-user'
const timestamp = '2026-01-01T12:00:00Z'

export const exampleIngredient: PendingFood = {
  name: 'Yogurt bianco', category: 'dairy', source: 'manual', food_key: null, off_food_id: null,
  calories_100g: 61, protein_100g: 3.5, carbs_100g: 4.7, fat_100g: 3.3,
  fiber_100g: 0, sugars_100g: 4.7, salt_100g: 0.12, nutrition_basis: 'per_100g',
}

export const exampleDishItems: DishItemDraft[] = [
  { food_name: 'Riso basmati', quantity_g: 160, unit: 'g', category: 'grain', food_key: 'basic:riso-basmati',
    calories: 560, protein_g: 12.8, carbs_g: 124.8, fat_g: 1.6, fiber_g: 1.6, sugars_g: 0.8, salt_g: 0.02,
    source: 'basic', off_food_id: null },
  { food_name: 'Zucchine', quantity_g: 300, unit: 'g', category: 'vegetable', food_key: 'basic:zucchine',
    calories: 51, protein_g: 3.6, carbs_g: 9, fat_g: 0.9, fiber_g: 3, sugars_g: 7.5, salt_g: 0.02,
    source: 'basic', off_food_id: null },
]

export const exampleDish: Dish = {
  id: 'tutorial-dish', user_id: DEMO_USER, name: 'Riso con zucchine', icon: null,
  meal_types: ['lunch', 'dinner'], created_at: timestamp, updated_at: timestamp,
  items: exampleDishItems.map((item, position) => ({ ...item, id: `tutorial-dish-item-${position}`,
    dish_id: 'tutorial-dish', position, created_at: timestamp })),
}

export const examplePlan: GymPlan = {
  id: 'tutorial-plan', user_id: DEMO_USER, name: 'La mia scheda', position: 0,
  created_at: timestamp, updated_at: timestamp,
  exercises: [{ id: 'tutorial-exercise', plan_id: 'tutorial-plan', position: 0,
    exercise_key: 'bench-press', exercise_name: 'Panca piana', equipment: 'Bilanciere', bench_angle: 0,
    target_sets: 3, target_reps: 10, target_reps_max: null, per_side: false }],
}

export const examplePhoto: MealPhotoAnalysis = {
  name: 'Pasta al pomodoro', confidence: 'medium', warnings: [],
  items: [{ food_name: 'Pasta cotta', quantity_g: 200, category: 'grain', calories: 300,
    protein_g: 10, carbs_g: 60, fat_g: 2, fiber_g: 3, sugars_g: 1, salt_g: 0.2, assumed: false, note: '' },
  { food_name: 'Sugo al pomodoro', quantity_g: 100, category: 'vegetable', calories: 80,
    protein_g: 2, carbs_g: 8, fat_g: 4.4, fiber_g: 2, sugars_g: 5, salt_g: 0.5, assumed: false, note: '' }],
}

export const exampleProfile: UserHealthProfile = {
  user_id: DEMO_USER, age: 30, sex: 'female', height_cm: 170, weight_kg: 72.5,
  activity_level: 'moderate', does_resistance_training: true, objective: 'maintain',
  target_weight_kg: null, target_date: null, body_fat_pct: null, bmr_override: null,
  tutorial_seen: true, created_at: timestamp, updated_at: timestamp,
}

export const exampleGoals: UserGoals = {
  user_id: DEMO_USER, calorie_target: 2200, protein_g: 116, carbs_g: 273, fat_g: 64,
  calculation_weight_kg: 72.5, updated_at: timestamp,
}
