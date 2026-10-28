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

// A main meal is a single group, including additions logged after a snack.
// Anchor snacks to when each meal FIRST appeared, so late additions cannot
// move an existing post-dinner snack into the middle of dinner.
export function buildMealTimeline(meals: Meal[]): MealTimelineGroup[] {
  const mainGroups = FIXED_MEAL_TYPES.map(type => ({
    type,
    entries: sortEntries(meals.filter(meal => meal.meal_type === type).flatMap(meal => meal.entries)),
  })).filter(group => group.entries.length > 0)
  const snacks = sortEntries(meals.filter(meal => meal.meal_type === 'snack').flatMap(meal => meal.entries))
  const snackBuckets: MealEntry[][] = Array.from({ length: mainGroups.length + 1 }, () => [])

  for (const snack of snacks) {
    const time = entryTime(snack)
    let latestMainIndex = -1
    let latestMainTime = -Infinity
    mainGroups.forEach(({ entries }, index) => {
      const mainTime = entryTime(entries[0])
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

  mainGroups.forEach(({ type, entries }, index) => {
    append('snack', snackBuckets[index])
    append(type, entries)
  })
  append('snack', snackBuckets[mainGroups.length])
  // Most recent moment first; within each meal the latest dish appears first.
  return timeline.reverse().map(group => ({ ...group, entries: group.entries.reverse() }))
}
