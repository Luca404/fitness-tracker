import { BASIC_FOODS } from './basicFoods'
import type { Dish, DishItem } from '../types'

interface SuggestedDishTemplate {
  id: string
  name: string
  ingredients: Array<{ foodId: string; quantityG: number }>
}

const TEMPLATES: SuggestedDishTemplate[] = [
  { id: 'pasta-pomodoro', name: 'Pasta al pomodoro', ingredients: [
    { foodId: 'pasta-semola', quantityG: 80 }, { foodId: 'sugo-pomodoro', quantityG: 120 },
    { foodId: 'olio-evo', quantityG: 10 }, { foodId: 'parmigiano', quantityG: 15 },
  ] },
  { id: 'riso-pollo-zucchine', name: 'Riso, pollo e zucchine', ingredients: [
    { foodId: 'riso-basmati', quantityG: 70 }, { foodId: 'petto-pollo', quantityG: 200 },
    { foodId: 'zucchine', quantityG: 180 }, { foodId: 'olio-evo', quantityG: 10 },
  ] },
  { id: 'pasta-tonno', name: 'Pasta al tonno', ingredients: [
    { foodId: 'pasta-semola', quantityG: 80 }, { foodId: 'tonno-naturale', quantityG: 100 },
    { foodId: 'passata-pomodoro', quantityG: 100 }, { foodId: 'olio-evo', quantityG: 8 },
  ] },
  { id: 'omelette-spinaci', name: 'Omelette agli spinaci', ingredients: [
    { foodId: 'uovo-intero', quantityG: 120 }, { foodId: 'spinaci', quantityG: 120 },
    { foodId: 'parmigiano', quantityG: 15 }, { foodId: 'olio-evo', quantityG: 5 },
  ] },
  { id: 'insalata-ceci', name: 'Insalata di ceci', ingredients: [
    { foodId: 'ceci-secchi', quantityG: 65 }, { foodId: 'pomodori', quantityG: 150 },
    { foodId: 'cetrioli', quantityG: 100 }, { foodId: 'olio-evo', quantityG: 10 },
  ] },
  { id: 'salmone-broccoli-riso', name: 'Salmone con riso e broccoli', ingredients: [
    { foodId: 'salmone', quantityG: 180 }, { foodId: 'riso-basmati', quantityG: 65 },
    { foodId: 'broccoli', quantityG: 180 }, { foodId: 'olio-evo', quantityG: 5 },
  ] },
  { id: 'yogurt-bowl', name: 'Yogurt bowl alla banana', ingredients: [
    { foodId: 'yogurt-greco-0', quantityG: 170 }, { foodId: 'banana', quantityG: 120 },
    { foodId: 'avena-fiocchi', quantityG: 35 }, { foodId: 'miele', quantityG: 10 },
  ] },
  { id: 'couscous-ceci', name: 'Couscous con ceci e peperoni', ingredients: [
    { foodId: 'couscous', quantityG: 75 }, { foodId: 'ceci-secchi', quantityG: 55 },
    { foodId: 'peperoni', quantityG: 150 }, { foodId: 'olio-evo', quantityG: 10 },
  ] },
  { id: 'zuppa-lenticchie', name: 'Zuppa di lenticchie', ingredients: [
    { foodId: 'lenticchie-secche', quantityG: 80 }, { foodId: 'carote', quantityG: 80 },
    { foodId: 'cipolla', quantityG: 50 }, { foodId: 'passata-pomodoro', quantityG: 100 },
  ] },
  { id: 'caprese', name: 'Insalata caprese', ingredients: [
    { foodId: 'mozzarella', quantityG: 125 }, { foodId: 'pomodori', quantityG: 200 },
    { foodId: 'basilico', quantityG: 5 }, { foodId: 'olio-evo', quantityG: 10 },
  ] },
]

function buildItem(templateId: string, foodId: string, quantityG: number, position: number): DishItem {
  const food = BASIC_FOODS.find(candidate => candidate.id === foodId)
  if (!food) throw new Error(`Unknown suggested food: ${foodId}`)
  const factor = quantityG / 100
  return {
    id: `suggested:${templateId}:${foodId}`,
    dish_id: `suggested:${templateId}`,
    position,
    food_name: food.name,
    quantity_g: quantityG,
    category: food.category,
    food_key: `basic:${food.id}`,
    calories: Math.round(food.calories * factor),
    protein_g: Math.round(food.protein_g * factor * 10) / 10,
    carbs_g: Math.round(food.carbs_g * factor * 10) / 10,
    fat_g: Math.round(food.fat_g * factor * 10) / 10,
    source: 'basic',
    off_food_id: null,
    created_at: '',
  }
}

export const SUGGESTED_DISHES: Dish[] = TEMPLATES.map(template => ({
  id: `suggested:${template.id}`,
  user_id: '',
  name: template.name,
  icon: null,
  created_at: '',
  updated_at: '',
  items: template.ingredients.map((ingredient, position) =>
    buildItem(template.id, ingredient.foodId, ingredient.quantityG, position)
  ),
}))
