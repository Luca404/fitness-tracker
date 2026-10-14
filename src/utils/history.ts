import { eachDayOfInterval, format, parseISO } from 'date-fns'
import type { GymSession, Meal, WeightLog, Workout } from '../types'
import { mealItems } from './mealEntries'
import { estimateGymSessionCalories, weightForSessionDate } from './gymSessionSummary'

export function buildHistoryData(from: string, to: string, meals: Meal[], workouts: Workout[],
  sessions: GymSession[], weightLogs: WeightLog[], fallbackWeightKg: number | null) {
  return eachDayOfInterval({ start: parseISO(from), end: parseISO(to) }).map(day => {
    const date = format(day, 'yyyy-MM-dd')
    const consumed = meals.filter(meal => meal.date === date).flatMap(mealItems)
      .reduce((sum, item) => sum + item.calories, 0)
    const burned = workouts.filter(workout => workout.date === date).reduce((sum, workout) => sum + workout.calories_burned, 0)
      + sessions.filter(session => session.date === date).reduce((sum, session) => sum
        + (estimateGymSessionCalories(session, weightForSessionDate(date, weightLogs, fallbackWeightKg)) ?? 0), 0)
    return { date: format(day, 'dd/MM'), Mangiato: consumed, Bruciato: burned }
  })
}
