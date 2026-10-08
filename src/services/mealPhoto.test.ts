import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isMealPhotoAnalysis, type MealPhotoAnalysis } from '../../supabase/functions/_shared/mealPhotoAnalysis'
import { consumedPhotoItems, isMealPhotoEntry } from '../utils/mealPhoto'

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), prepareImage: vi.fn() }))
vi.mock('./supabase', () => ({ supabase: { functions: { invoke: mocks.invoke } } }))
vi.mock('./photoUpload', () => ({ prepareImage: mocks.prepareImage, functionErrorMessage: async () => 'Sessione non valida.' }))
import { analyzeMealPhoto, mealPhotoItems } from './mealPhoto'

const analysis: MealPhotoAnalysis = {
  name: 'Pasta al pomodoro', confidence: 'medium', warnings: ['Quantità di olio ipotizzata.'],
  items: [
    { food_name: 'Pasta cotta', quantity_g: 200, category: 'grain', calories: 300, protein_g: 10, carbs_g: 60, fat_g: 2, assumed: false, note: null },
    { food_name: 'Olio', quantity_g: 10, category: 'fat', calories: 90, protein_g: 0, carbs_g: 0, fat_g: 10, assumed: true, note: 'Condimento non distinguibile.' },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.prepareImage.mockResolvedValue({ base64: 'YQ==', mimeType: 'image/jpeg' })
  mocks.invoke.mockResolvedValue({ data: { analysis }, error: null })
})

describe('meal photo analysis', () => {
  it('sends the compressed photo and menu description to the dedicated function', async () => {
    const file = new File(['photo'], 'meal.png', { type: 'image/png' })
    expect(await analyzeMealPhoto(file, '  Pasta dal menù  ')).toEqual(analysis)
    expect(mocks.prepareImage).toHaveBeenCalledWith(file)
    expect(mocks.invoke).toHaveBeenCalledWith('analyze-meal-photo', { body: {
      image_base64: 'YQ==', mime_type: 'image/jpeg', description: 'Pasta dal menù',
    } })
  })

  it('keeps cooked portions detached from the pantry, unknown nutrients and label-photo provenance', () => {
    const items = mealPhotoItems(analysis)
    expect(items[0]).toMatchObject({ quantity_g: 200, calories: 300, source: 'ai_meal_photo',
      fiber_g: null, sugars_g: null, salt_g: null, pantry_item_id: null, food_key: null, dish_item_id: null })
    const half = consumedPhotoItems(items, 50)
    expect(half[0]).toMatchObject({ quantity_g: 100, calories: 150, carbs_g: 30, fiber_g: null })
    expect(half[1]).toMatchObject({ quantity_g: 5, calories: 45, fat_g: 5 })
    expect(items[0].quantity_g).toBe(200)
  })

  it.each([0, 0.5, -1, 101, NaN, Infinity])('rejects an invalid eaten percentage %s', percentage => {
    expect(consumedPhotoItems(mealPhotoItems(analysis), percentage)).toEqual([])
  })

  it('rejects empty or malformed model responses before allowing a diary entry', async () => {
    mocks.invoke.mockResolvedValueOnce({ data: { analysis: { ...analysis, items: [] } }, error: null })
    await expect(analyzeMealPhoto(new File([], 'meal.jpg'))).rejects.toThrow('Non riconosco')
    mocks.invoke.mockResolvedValueOnce({ data: { analysis: { ...analysis, items: [{ ...analysis.items[0], quantity_g: '200' }] } }, error: null })
    await expect(analyzeMealPhoto(new File([], 'meal.jpg'))).rejects.toThrow('non è valida')
  })

  it('rejects nonfinite, negative, physically inconsistent or oversized estimates', () => {
    expect(isMealPhotoAnalysis(analysis)).toBe(true)
    for (const change of [
      { quantity_g: 0 }, { quantity_g: NaN }, { quantity_g: 10001 }, { quantity_g: 1 },
      { calories: Infinity }, { calories: 0 }, { carbs_g: -1 }, { assumed: 'false' }, { category: 'unknown' },
    ]) expect(isMealPhotoAnalysis({ ...analysis, items: [{ ...analysis.items[0], ...change }] })).toBe(false)
  })

  it('does not mislabel nutrition-label imports as estimated meals', () => {
    expect(isMealPhotoEntry({ items: [{ source: 'ai_photo' }] } as Parameters<typeof isMealPhotoEntry>[0])).toBe(false)
    expect(isMealPhotoEntry({ items: [{ source: 'ai_meal_photo' }] } as Parameters<typeof isMealPhotoEntry>[0])).toBe(true)
  })

  it('propagates server errors and skips the request when photo preparation fails', async () => {
    mocks.invoke.mockResolvedValueOnce({ data: null, error: new Error('401') })
    await expect(analyzeMealPhoto(new File([], 'meal.jpg'))).rejects.toThrow('Sessione non valida')
    mocks.prepareImage.mockRejectedValueOnce(new Error('Formato non supportato'))
    await expect(analyzeMealPhoto(new File([], 'meal.heic'))).rejects.toThrow('Formato non supportato')
    expect(mocks.invoke).toHaveBeenCalledTimes(1)
  })
})
