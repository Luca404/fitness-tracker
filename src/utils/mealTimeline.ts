import type { Meal, MealEntry, MealType } from '../types'

export interface MealTimelineGroup {
  type: MealType
  entries: MealEntry[]
}

const FIXED_MEAL_TYPES: Exclude<MealType, 'snack'>[] = ['breakfast', 'lunch', 'dinner', 'drinks']

function entryTime(entry: MealEntry): number {
  const time = Date.parse(entry.created_at)
  return Number.isFinite(time) ? time : 0
}

function sortEntries(entries: MealEntry[]): MealEntry[] {
  return [...entries].sort((a, b) => entryTime(a) - entryTime(b) || a.id.localeCompare(b.id))
}

// Keep the familiar order of the main meal types even if someone logs one
// late. Place each snack after the most recently registered main entry, so it
// can also sit between two entries of the same meal type.
export function buildMealTimeline(meals: Meal[]): MealTimelineGroup[] {
  const mainEntries = FIXED_MEAL_TYPES.flatMap(type =>
    sortEntries(meals.filter(meal => meal.meal_type === type).flatMap(meal => meal.entries))
      .map(entry => ({ type, entry })))
  const snacks = sortEntries(meals.filter(meal => meal.meal_type === 'snack').flatMap(meal => meal.entries))
  const snackBuckets: MealEntry[][] = Array.from({ length: mainEntries.length + 1 }, () => [])

  for (const snack of snacks) {
    const time = entryTime(snack)
    let latestMainIndex = -1
    let latestMainTime = -Infinity
    mainEntries.forEach(({ entry }, index) => {
      const mainTime = entryTime(entry)
      if (mainTime <= time && mainTime >= latestMainTime) {
        latestMainIndex = index
        latestMainTime = mainTime
      }
    })
    snackBuckets[latestMainIndex + 1].push(snack)
  }

  const timeline: MealTimelineGroup[] = []
  function append(type: MealType, entries: MealEntry[]) {
    if (entries.length === 0) return
    const previous = timeline.at(-1)
    if (previous?.type === type) previous.entries.push(...entries)
    else timeline.push({ type, entries: [...entries] })
  }

  mainEntries.forEach(({ type, entry }, index) => {
    append('snack', snackBuckets[index])
    append(type, [entry])
  })
  append('snack', snackBuckets[mainEntries.length])
  return timeline
}
