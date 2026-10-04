import { BASIC_FOODS } from '../data/basicFoods'
import type { DishItemDraft, MealItem } from '../types'
import { roundToTwo } from './decimal'

export const ALCOHOL_UNIT_GRAMS = 12
const catalogStrengths = new Map(BASIC_FOODS.map(food => [`basic:${food.id}`, food.alcohol_abv]))
export function validAlcoholStrength(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value) && value >= 0 && value <= 100
}
export function alcoholStrength(item: { alcohol_abv?: number | null; food_key?: string | null }): number | null {
  // A recorded zero is deliberate. Older catalog drinks use the indicative default.
  const value = item.alcohol_abv ?? catalogStrengths.get(item.food_key ?? '')
  return validAlcoholStrength(value) ? value : null
}
export function ethanolGrams(volumeMl: number, abv: number): number {
  return volumeMl * abv / 100 * 0.789
}
export function alcoholUnits(volumeMl: number, abv: number): number {
  return ethanolGrams(volumeMl, abv) / ALCOHOL_UNIT_GRAMS
}
export function alcoholTotal(items: MealItem[]) {
  const drinks = items.filter(item => item.category === 'alcohol' || (alcoholStrength(item) ?? 0) > 0)
  if (!drinks.length) return { value: 0, partial: false }
  const values = drinks.map(item => {
    const abv = alcoholStrength(item)
    if (abv === 0) return 0
    return abv != null && item.unit === 'ml' && Number.isFinite(item.quantity_g) && item.quantity_g >= 0
      ? alcoholUnits(item.quantity_g, abv) : null
  })
  const known = values.filter((value): value is number => value != null)
  return { value: known.length ? known.reduce((sum, value) => sum + value, 0) : null,
    partial: known.length > 0 && known.length < values.length }
}
/** Adjust only ethanol energy; keep the drink's other nutrients unchanged. */
export function withAlcoholStrength<T extends Pick<DishItemDraft, 'calories' | 'quantity_g' | 'unit' | 'food_key' | 'alcohol_abv'>>(item: T, abv: number | null): T {
  const original = alcoholStrength(item)
  const calories = original != null && validAlcoholStrength(abv) && original !== abv && item.unit === 'ml'
    ? roundToTwo(Math.max(item.calories, ethanolGrams(item.quantity_g, original) * 7)
      + ethanolGrams(item.quantity_g, abv - original) * 7) : item.calories
  return { ...item, calories, alcohol_abv: abv }
}
