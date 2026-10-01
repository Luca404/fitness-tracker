import type { DishItem } from '../types'
import { roundToTwo } from './decimal'

export type CookingMethod = 'raw' | 'boiled' | 'pan'
type Ingredient = Pick<DishItem, 'food_name' | 'food_key' | 'category' | 'quantity_g'> & { unit?: 'g' | 'ml' }

// Cooked grams per raw gram. CREA values where the specific preparation is
// listed; similar foods and unspecified preparations use cautious estimates.
// https://www.alimentinutrizione.it/presentazione-dati (Tabella C)
const BOILED_YIELD: Record<string, number> = {
  'ceci-secchi': 2.9, 'fagioli-borlotti-secchi': 2.3,
  'fagioli-cannellini-secchi': 2.3, 'lenticchie-secche': 2.47,
  'lenticchie-rosse-secche': 2.47,
  'pasta-semola': 1.99, 'pasta-integrale': 1.99, 'pasta-uovo': 2.99,
  'riso-bianco': 2.6, 'riso-basmati': 3, 'riso-integrale': 2.6,
  'couscous': 2.25, quinoa: 3.12, farro: 2.28, 'orzo-perlato': 2.67,
  agretti: 0.86, asparagi: 0.96, bietole: 0.86, carciofi: 0.74,
  cardi: 0.6, carote: 0.87, cavolfiore: 0.93,
  'cavolini-bruxelles': 0.9, 'cavolo-cappuccio': 0.99,
  'cavolo-verza': 1, cicoria: 1, cipolla: 0.73,
  finocchi: 0.86, patate: 0.87, porro: 0.98,
  'rapa-bianca': 0.93, spinaci: 0.84, zucchine: 0.9,
  broccoli: 0.96,
  'petto-tacchino': 0.94, 'fesa-tacchino': 0.94,
}

const PAN_YIELD: Record<string, number> = {
  carote: 0.38, peperoni: 0.6, zucchine: 0.76, melanzane: 0.8,
  cipolla: 0.44, patate: 0.64, sedano: 0.32,
  'funghi-champignon': 0.53,
  'petto-tacchino': 0.85, 'fesa-tacchino': 0.85,
  'petto-pollo': 0.83,
  // For tomatoes, use a cautious estimate: the retained sauce varies widely.
  pomodori: 0.7,
}

function basicId(item: Ingredient): string | null {
  return item.food_key?.startsWith('basic:') ? item.food_key.slice(6) : null
}

function isAlreadyCooked(item: Ingredient): boolean {
  const id = basicId(item) ?? ''
  return /scatola|cotti|cotte|fritte|^(hummus|tofu|seitan|prosciutto-crudo|prosciutto-cotto|bresaola|salmone-affumicato|tonno-naturale)$/.test(id)
    || /\b(cott[oaie]|pront[oaie]|bollit[oaie]|less[oaie]|scatola|lattina|scolat[oaie]|affumicat[oaie]|prosciutto|bresaola)\b/i.test(item.food_name)
}

function isDryLegume(item: Ingredient): boolean {
  return item.category === 'legume' && !isAlreadyCooked(item) && (/secc[hoaie]/.test(basicId(item) ?? '')
    || /\b(secch[ioaie]|dry)\b/i.test(item.food_name))
}

function estimatedVegetableYield(item: Ingredient, method: CookingMethod): number {
  const name = `${basicId(item) ?? ''} ${item.food_name}`.toLowerCase()
  if (method === 'boiled') {
    if (/insalata|lattuga|rucola|radicchio|indivia|scarola|valeriana|cime.rapa|cavolo.nero/.test(name)) return 0.85
    if (/patat|barbabiet|rapa|pastinaca|topinambur|carot/.test(name)) return 0.9
    return 0.9
  }
  if (/spinac|bietol|cicor|indivia|scarola|valeriana|cime.rapa|cavolo.nero|lattuga|rucola/.test(name)) return 0.55
  if (/fungh/.test(name)) return 0.6
  if (/pomodor|peperon|zucchin|melanzan|zucca|cetriol/.test(name)) return 0.7
  if (/patat|barbabiet|rapa|pastinaca|topinambur|carot|cavol|broccol|asparag|finocch|carciof/.test(name)) return 0.8
  return 0.75
}

export function defaultCookingMethod(item: Ingredient): CookingMethod {
  if (item.unit === 'ml' || isAlreadyCooked(item)) return 'raw'
  if (isDryLegume(item)) return 'boiled'
  if (item.category === 'grain' && /^(riso|pasta|couscous|quinoa|farro|orzo)/.test(basicId(item) ?? item.food_name.toLowerCase())) return 'boiled'
  if (item.category === 'meat' || item.category === 'fish') return 'pan'
  if (item.category === 'egg' || item.category === 'plant_protein') return 'pan'
  if (item.category === 'sauce' && /pomodoro|passata|polpa|pelati/.test(basicId(item) ?? item.food_name.toLowerCase())) return 'pan'
  if (item.category === 'vegetable' && !/insalata|lattuga|rucola|radicchio|cetriol/i.test(item.food_name)) return 'pan'
  return 'raw'
}

export function cookedWeightFactor(item: Ingredient, method: CookingMethod): number {
  if (method === 'raw') return 1
  const id = basicId(item)
  if (isDryLegume(item)) {
    const boiled = (id && BOILED_YIELD[id]) || (/ceci/i.test(item.food_name) ? 2.9 : /lenticch/i.test(item.food_name) ? 2.47 : 2.3)
    return method === 'pan' ? boiled * 0.9 : boiled // Pan means boiled first, then reheated.
  }
  if (isAlreadyCooked(item) && method === 'boiled') return 1
  if (item.category === 'grain' && method === 'pan') return (id && BOILED_YIELD[id]) || 2.5
  if (id) {
    const specific = (method === 'boiled' ? BOILED_YIELD : PAN_YIELD)[id]
    if (specific != null) return specific
  }
  switch (item.category) {
    case 'grain': return method === 'boiled' ? 2.5 : 1
    case 'legume': return method === 'boiled' ? 0.9 : 0.85
    case 'vegetable': return estimatedVegetableYield(item, method)
    case 'fruit': return method === 'boiled' ? 0.95 : 0.8
    case 'meat': return method === 'boiled' ? 0.85 : 0.8
    case 'fish': return method === 'boiled' ? 0.85 : 0.75
    case 'egg': return method === 'boiled' ? 1 : 0.9
    case 'plant_protein': return method === 'boiled' ? 0.95 : 0.85
    case 'sauce': return method === 'boiled' ? 1 : 0.8
    case 'bakery': return method === 'boiled' ? 1 : 0.9
    case 'dairy': return method === 'boiled' ? 1 : 0.95
    case 'nuts_seeds': return method === 'boiled' ? 1 : 0.95
    case 'spread': return method === 'boiled' ? 1 : 0.95
    case 'condiment': return method === 'boiled' ? 1 : 0.9
    case 'seasoning': return method === 'boiled' ? 1 : 0.8
    case 'sweet': return method === 'boiled' ? 1 : 0.95
    case 'snack': return method === 'boiled' ? 1 : 0.95
    case 'prepared': return method === 'boiled' ? 1 : 0.9
    case 'fat':
    case 'beverage':
    case 'alcohol':
    case 'supplement':
    case 'other': return 1
  }
}

export function estimateCookedItemWeights(items: Ingredient[], methods?: CookingMethod[]): number[] {
  return items.map((item, index) => roundToTwo(item.quantity_g * cookedWeightFactor(item, methods?.[index] ?? defaultCookingMethod(item))))
}

export function estimateCookedWeight(items: Ingredient[], methods?: CookingMethod[]): number {
  return Math.max(1, roundToTwo(estimateCookedItemWeights(items, methods).reduce((sum, weight) => sum + weight, 0)))
}

export function recipeSignature(items: Ingredient[]): string {
  const total = items.reduce((sum, item) => sum + item.quantity_g, 0)
  return JSON.stringify(items.map(item => [
    item.food_key, item.food_name, item.category, item.unit ?? 'g',
    total > 0 ? Math.round(item.quantity_g / total * 1000) : 0,
  ]))
}

export function fractionOfPreparedDish(totalCookedG: number, numerator: 1 | 2 | 3): number {
  return roundToTwo(totalCookedG * numerator / 4)
}
