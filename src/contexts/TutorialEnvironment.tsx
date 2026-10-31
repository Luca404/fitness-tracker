import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { Dish, DishItemDraft, GymPlan, PreparedBatch } from '../types'
import type { PendingFood } from '../utils/pantryDraft'
import type { MealPhotoAnalysis } from '../services/mealPhoto'

type Services = {
  api: typeof import('../services/api')
  gym: typeof import('../services/gymApi')
  nutrition: typeof import('../services/nutrition')
}

export interface TutorialEnvironmentValue {
  scene: string
  services: Services
  examples: {
    ingredient: PendingFood
    dish: Dish
    dishItems: DishItemDraft[]
    plan: GymPlan
    photo: MealPhotoAnalysis
    batch: PreparedBatch
  }
}

const TutorialEnvironment = createContext<TutorialEnvironmentValue | null>(null)

export function TutorialEnvironmentProvider({ value, children }: { value: TutorialEnvironmentValue; children: ReactNode }) {
  return <TutorialEnvironment.Provider value={value}>{children}</TutorialEnvironment.Provider>
}

// Production keeps its existing services. Only the isolated tutorial supplies overrides.
// eslint-disable-next-line react-refresh/only-export-components
export function useAppService<K extends keyof Services>(key: K, production: Services[K]): Services[K] {
  return useContext(TutorialEnvironment)?.services[key] ?? production
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTutorialEnvironment() {
  return useContext(TutorialEnvironment)
}
