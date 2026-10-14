import NutritionFields, { type NutritionFieldValues } from '../meals/NutritionFields'
import type { PendingFood, NutrientFieldKey } from '../../utils/pantryDraft'

const fields: Record<keyof NutritionFieldValues, NutrientFieldKey> = {
  calories: 'calories_100g', protein_g: 'protein_100g', carbs_g: 'carbs_100g', fat_g: 'fat_100g',
  sugars_g: 'sugars_100g', saturated_fat_g: 'saturated_fat_100g', fiber_g: 'fiber_100g', salt_g: 'salt_100g',
}

export function PendingNutritionFields({ food, onChange, disabled = false }: {
  food: PendingFood
  onChange: (key: NutrientFieldKey, value: number | null) => void
  disabled?: boolean
}) {
  const values: NutritionFieldValues = {
    calories: food.calories_100g, protein_g: food.protein_100g, carbs_g: food.carbs_100g, fat_g: food.fat_100g,
    sugars_g: food.sugars_100g, saturated_fat_g: food.saturated_fat_100g, fiber_g: food.fiber_100g, salt_g: food.salt_100g,
  }
  const perMl = food.nutrition_basis === 'per_100ml' || food.category === 'beverage' || food.category === 'alcohol'
  return <NutritionFields values={values} includeSaturatedFat disabled={disabled} basis={perMl ? 'per100ml' : 'per100g'}
    onChange={(key, value) => onChange(fields[key], value)} />
}
