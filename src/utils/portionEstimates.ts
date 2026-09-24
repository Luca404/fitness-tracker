import type { FoodCategory, PieceSize } from '../types'

export type PortionEstimateId = 'slice' | 'teaspoon' | 'tablespoon' | PieceSize

export interface PortionEstimate {
  id: PortionEstimateId
  label: string
  singularLabel: string
  grams: number
  pluralLabel?: string
}

type PieceFood = { singular: string; plural: string; grams: [number, number, number] }

// Edible weights are indicative; grams remain available for exact portions.
const PIECE_FOODS: { category: FoodCategory; pattern: RegExp; food: PieceFood }[] = [
  { category: 'fruit', pattern: /\bmela\b|\bmele\b/i, food: { singular: 'mela', plural: 'mele', grams: [110, 150, 190] } },
  { category: 'fruit', pattern: /\bbanana\b|\bbanane\b/i, food: { singular: 'banana', plural: 'banane', grams: [80, 118, 150] } },
  { category: 'fruit', pattern: /\bpera\b|\bpere\b/i, food: { singular: 'pera', plural: 'pere', grams: [100, 150, 200] } },
  { category: 'fruit', pattern: /\barancia\b|\barance\b/i, food: { singular: 'arancia', plural: 'arance', grams: [100, 140, 180] } },
  { category: 'vegetable', pattern: /\bpomodor[oi]\b/i, food: { singular: 'pomodoro', plural: 'pomodori', grams: [80, 120, 180] } },
  { category: 'vegetable', pattern: /\bcarot[ae]\b/i, food: { singular: 'carota', plural: 'carote', grams: [50, 70, 100] } },
  { category: 'vegetable', pattern: /\bzucchin[ae]\b/i, food: { singular: 'zucchina', plural: 'zucchine', grams: [120, 180, 250] } },
  { category: 'egg', pattern: /\buov[oaie]\b/i, food: { singular: 'uovo', plural: 'uova', grams: [38, 44, 50] } },
]

const SIZE_NAMES: PieceSize[] = ['small', 'medium', 'large']

function pieceFood(category: FoodCategory, foodName: string): PieceFood | undefined {
  if (/albume|tuorlo/i.test(foodName)) return undefined
  return PIECE_FOODS.find(entry => entry.category === category && entry.pattern.test(foodName))?.food
}

function adjective(size: PieceSize, plural: boolean, feminine: boolean): string {
  if (size === 'small') return feminine ? (plural ? 'piccole' : 'piccola') : (plural ? 'piccoli' : 'piccolo')
  if (size === 'large') return plural ? 'grandi' : 'grande'
  return feminine ? (plural ? 'medie' : 'media') : (plural ? 'medi' : 'medio')
}

function isFeminine(food: PieceFood, plural: boolean): boolean {
  return food.singular !== 'pomodoro' && (food.singular !== 'uovo' || plural)
}

export function formatPieceQuantity(category: FoodCategory, foodName: string, size: PieceSize, count: number): string {
  const food = pieceFood(category, foodName)
  const plural = count !== 1
  const feminine = food ? isFeminine(food, plural) : false
  const noun = food ? (plural ? food.plural : food.singular) : (plural ? 'pezzi' : 'pezzo')
  return `${count} ${noun} ${adjective(size, plural, feminine)}`
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
  const food = pieceFood(category, foodName)
  if (food) return SIZE_NAMES.map((size, index) => ({
    id: size,
    label: `${food.plural} ${adjective(size, true, isFeminine(food, true))}`,
    singularLabel: `${food.singular} ${adjective(size, false, isFeminine(food, false))}`,
    pluralLabel: `${food.plural} ${adjective(size, true, isFeminine(food, true))}`,
    grams: food.grams[index],
  }))
  if (category === 'bakery' && isSlicedBread(foodName)) return [SLICE]
  if (category === 'spread') return [SPREAD_TEASPOON]
  if (category === 'fat' && isOil(foodName)) return [SAUCE_TEASPOON, OIL_TABLESPOON]
  if (category === 'sauce' || category === 'condiment') return [SAUCE_TEASPOON, SAUCE_TABLESPOON]
  return []
}
