import { writeFileSync } from 'node:fs'
import { BASIC_FOODS } from '../../src/data/basicFoods.ts'
import { getGuideline } from '../../src/data/nutritionGuidelines.ts'
import { normalizeIngredientName } from '../../src/utils/ingredientMatching.ts'

const byName = new Map<string, { key: string; category: string }>()
const strengths: Record<string, number> = {}
for (const food of BASIC_FOODS) {
  const key = `basic:${food.id}`
  const name = normalizeIngredientName(food.name)
  if (!byName.has(name)) byName.set(name, { key, category: food.category })
  if (food.alcohol_abv != null) strengths[key] = food.alcohol_abv
}

const limit = (nutrient: Parameters<typeof getGuideline>[0], sex: 'female' | 'male' = 'female', age = 18) => {
  const value = getGuideline(nutrient, sex, age)?.limitValue
  if (value == null) throw new Error(`Missing guideline for ${nutrient}`)
  return value
}

const targets = {
  vegetables: limit('vegetables'),
  fruit: limit('fruit'),
  legumes: limit('legumes'),
  fish: limit('fish'),
  fiber: limit('fiber'),
  sugarEnergyPercent: limit('total_sugars'),
  salt: limit('salt'),
  adultMaleAlcoholGrams: limit('alcohol', 'male'),
  adultFemaleAlcoholGrams: limit('alcohol'),
  olderAdultAlcoholGrams: limit('alcohol', 'male', 65),
}

writeFileSync(
  new URL('../androidApp/src/main/res/raw/habit_catalog.json', import.meta.url),
  JSON.stringify({ foodsByName: Object.fromEntries(byName), alcoholStrengths: strengths, targets }) + '\n',
)
