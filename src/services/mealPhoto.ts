import { supabase } from './supabase'
import { prepareImage, functionErrorMessage } from './photoUpload'
import { isMealPhotoAnalysis, type MealPhotoAnalysis } from '../../supabase/functions/_shared/mealPhotoAnalysis'
import type { DishItemDraft } from '../types'

export type { MealPhotoAnalysis } from '../../supabase/functions/_shared/mealPhotoAnalysis'

export function mealPhotoItems(analysis: MealPhotoAnalysis): DishItemDraft[] {
  return analysis.items.map(item => ({
    food_name: item.food_name.trim(), quantity_g: item.quantity_g, unit: 'g',
    category: item.category, calories: item.calories,
    protein_g: item.protein_g, carbs_g: item.carbs_g, fat_g: item.fat_g,
    fiber_g: null, sugars_g: null, salt_g: null,
    source: 'ai_meal_photo', food_key: null, pantry_item_id: null,
    off_food_id: null, dish_item_id: null, is_customization: false,
  }))
}

export async function analyzeMealPhoto(file: File, description = ''): Promise<MealPhotoAnalysis> {
  if (description.trim().length > 1000) throw new Error('La descrizione deve essere più breve di 1000 caratteri.')
  const image = await prepareImage(file)
  const { data, error } = await supabase.functions.invoke('analyze-meal-photo', {
    body: { image_base64: image.base64, mime_type: image.mimeType, description: description.trim() },
  })
  if (error) throw new Error(await functionErrorMessage(error))
  const analysis: unknown = data?.analysis
  if (!isMealPhotoAnalysis(analysis)) throw new Error('La stima ricevuta non è valida. Riprova con una foto più chiara.')
  if (analysis.items.length === 0) throw new Error('Non riconosco un piatto nella foto. Prova una foto più chiara o l’inserimento manuale.')
  return analysis
}
