import { describe, expect, it } from 'vitest'
import { analysisToPantryDraft, barcodeProductToAnalysis } from './nutritionLabel'
import type { NutritionLabelAnalysis } from './nutritionLabel'
import type { BarcodeProduct } from '../types'

const analysis: NutritionLabelAnalysis = {
  barcode: '8000500310427',
  product_name: '  Yogurt bianco  ',
  brand: ' Marca ',
  package_quantity_label: '2 x 125 g',
  package_quantity_value: 250,
  package_quantity_unit: 'g',
  package_piece_count: null,
  package_net_quantity_value: 250,
  package_net_quantity_unit: 'g',
  serving_size: '125 g',
  ingredients: 'Latte, fermenti',
  allergens: 'Latte',
  category: 'dairy',
  nutrition_basis: 'per_100g',
  calories_100: 64,
  protein_100g: 4.1,
  carbs_100g: 5,
  fat_100g: 3.2,
  fiber_100g: null,
  sugars_100g: 5,
  saturated_fat_100g: 2.1,
  salt_100g: 0.1,
  confidence: 'high',
  warnings: [],
}

describe('analysisToPantryDraft', () => {
  it('maps the structured extraction into an editable pantry draft', () => {
    expect(analysisToPantryDraft(analysis)).toMatchObject({
      name: 'Yogurt bianco',
      barcode: '8000500310427',
      brand: 'Marca',
      quantityLabel: '2 x 125 g',
      quantityValue: 250,
      quantityUnit: 'g',
      calories100: 64,
      category: 'dairy',
    })
  })

  it('uses safe values when optional text or invalid nutrient numbers are returned', () => {
    const draft = analysisToPantryDraft({
      ...analysis,
      product_name: null,
      brand: ' ',
      calories_100: Number.NaN,
      protein_100g: -2,
    })

    expect(draft.name).toBe('Prodotto da etichetta')
    expect(draft.brand).toBeNull()
    expect(draft.calories100).toBe(0)
    expect(draft.protein100g).toBe(0)
  })

  it('keeps package pieces separate from net weight and uses pieces for pantry stock', () => {
    const draft = analysisToPantryDraft({
      ...analysis,
      package_quantity_label: '10 uova, porzione 58 g',
      package_quantity_value: 10,
      package_quantity_unit: 'pz',
      package_piece_count: 10,
      package_net_quantity_value: null,
      package_net_quantity_unit: null,
      serving_size: '58 g',
    })

    expect(draft.packagePieceCount).toBe(10)
    expect(draft.packageNetQuantityValue).toBeNull()
    expect(draft.quantityValue).toBe(10)
    expect(draft.quantityUnit).toBe('pz')
  })

  it('uses the printed litre quantity as 1000 ml instead of trusting an AI value of 1 ml', () => {
    const draft = analysisToPantryDraft({
      ...analysis,
      category: 'beverage',
      package_quantity_label: '1 L',
      package_quantity_value: 1,
      package_quantity_unit: 'ml',
      package_piece_count: null,
      package_net_quantity_value: 1,
      package_net_quantity_unit: 'ml',
    })

    expect(draft.quantityValue).toBe(1000)
    expect(draft.quantityUnit).toBe('ml')
    expect(draft.packageNetQuantityValue).toBe(1000)
    expect(draft.packageNetQuantityUnit).toBe('ml')
  })

  it('rebuilds a cached barcode product without requiring another AI response', () => {
    const cached: BarcodeProduct = {
      barcode: '8000500310427',
      name: 'Yogurt bianco',
      brand: 'Marca',
      package_quantity: '2 x 125 g',
      quantity_value: null,
      quantity_unit: null,
      package_piece_count: null,
      package_net_quantity_value: 250,
      package_net_quantity_unit: 'g',
      serving_size: '125 g',
      ingredients: 'Latte, fermenti',
      allergens: 'Latte',
      calories_100g: 64,
      protein_100g: 4.1,
      carbs_100g: 5,
      fat_100g: 3.2,
      fiber_100g: null,
      sugars_100g: 5,
      saturated_fat_100g: 2.1,
      unsaturated_fat_100g: 1.1,
      salt_100g: 0.1,
      category: 'dairy',
      source: 'openfoodfacts',
      off_food_id: '8000500310427',
      confidence: 'high',
      metadata: null,
      created_at: '2026-09-21T00:00:00Z',
      updated_at: '2026-09-21T00:00:00Z',
    }

    const restored = barcodeProductToAnalysis(cached)
    expect(restored.cache_hit).toBe(true)
    expect(restored.package_quantity_value).toBe(250)
    expect(restored.package_quantity_unit).toBe('g')
    expect(restored.calories_100).toBe(64)
  })
})
