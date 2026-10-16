import { eachDayOfInterval, format, parseISO, subDays } from 'date-fns'
import type { GymSession, Meal, WeightLog, Workout } from '../types'
import { mealItems } from './mealEntries'
import { estimateGymSessionCalories, weightForSessionDate } from './gymSessionSummary'

export interface HistoryDay {
  date: string
  Mangiato: number | null
  Bruciato: number | null
}

export function historyWindow(today: string, days: 7 | 30) {
  const currentDay = parseISO(today)
  return {
    from: format(subDays(currentDay, days), 'yyyy-MM-dd'),
    to: format(subDays(currentDay, 1), 'yyyy-MM-dd'),
  }
}

export function historyAverage(data: HistoryDay[], series: 'Mangiato' | 'Bruciato') {
  const values = data.map(day => day[series]).filter((value): value is number => value !== null)
  return {
    value: values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    days: values.length,
  }
}

export function buildHistoryData(from: string, to: string, meals: Meal[], workouts: Workout[],
  sessions: GymSession[], weightLogs: WeightLog[], fallbackWeightKg: number | null): HistoryDay[] {
  return eachDayOfInterval({ start: parseISO(from), end: parseISO(to) }).map(day => {
    const date = format(day, 'yyyy-MM-dd')
    const consumed = meals.filter(meal => meal.date === date).flatMap(mealItems)
      .reduce((sum, item) => sum + item.calories, 0)
    const dailyWorkouts = workouts.filter(workout => workout.date === date)
    const gymCalories = sessions.filter(session => session.date === date && session.completed_at)
      .map(session => estimateGymSessionCalories(session, weightForSessionDate(date, weightLogs, fallbackWeightKg)))
    const hasActivity = dailyWorkouts.length > 0 || gymCalories.some(value => value !== null)
    const burned = dailyWorkouts.reduce((sum, workout) => sum + workout.calories_burned, 0)
      + gymCalories.reduce<number>((sum, value) => sum + (value ?? 0), 0)
    return {
      date: format(day, 'dd/MM'),
      Mangiato: consumed > 0 ? consumed : null,
      // A diary day without exercise is a valid rest day. A wholly unlogged day is unknown.
      Bruciato: consumed > 0 || hasActivity ? burned : null,
    }
  })
}
