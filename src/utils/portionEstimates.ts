import type { FoodCategory } from '../types'

export type PortionEstimateId = 'slice' | 'teaspoon' | 'tablespoon'

export interface PortionEstimate {
  id: PortionEstimateId
  label: string
  singularLabel: string
  grams: number
}

const SLICE: PortionEstimate = {
  id: 'slice',
  label: 'fette',
  singularLabel: 'fetta',
  grams: 30,
}

const SPREAD_TEASPOON: PortionEstimate = {
  id: 'teaspoon',
  label: 'cucchiaini da tè',
  singularLabel: 'cucchiaino da tè',
  grams: 6,
}

const SAUCE_TEASPOON: PortionEstimate = {
  id: 'teaspoon',
  label: 'cucchiaini da tè',
  singularLabel: 'cucchiaino da tè',
  grams: 5,
}

const SAUCE_TABLESPOON: PortionEstimate = {
  id: 'tablespoon',
  label: 'cucchiai grandi',
  singularLabel: 'cucchiaio grande',
  grams: 15,
}

const OIL_TABLESPOON: PortionEstimate = {
  id: 'tablespoon',
  label: 'cucchiai grandi',
  singularLabel: 'cucchiaio grande',
  grams: 14,
}

function isSlicedBread(name: string): boolean {
  return /pane|bread|toast|pan bauletto|tramezzin/i.test(name)
}

function isOil(name: string): boolean {
  return /olio|\boil\b/i.test(name)
}

export function getPortionEstimates(category: FoodCategory, foodName: string): PortionEstimate[] {
  if (category === 'bakery' && isSlicedBread(foodName)) return [SLICE]
  if (category === 'spread') return [SPREAD_TEASPOON]
  if (category === 'fat' && isOil(foodName)) return [SAUCE_TEASPOON, OIL_TABLESPOON]
  if (category === 'sauce' || category === 'condiment') return [SAUCE_TEASPOON, SAUCE_TABLESPOON]
  return []
}
