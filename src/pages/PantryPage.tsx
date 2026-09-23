import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import * as api from '../services/api'
import { searchBasicFoods } from '../services/nutrition'
import { normalizeBarcode, resolveBarcodeProduct } from '../services/barcodeProducts'
import { analysisToPantryDraft, barcodeProductToAnalysis, confirmBarcodeProduct } from '../services/nutritionLabel'
import type { NutritionLabelAnalysis, NutritionBasis, AnalysisConfidence } from '../services/nutritionLabel'
import BarcodeScanner from '../components/pantry/BarcodeScanner'
import NutritionLabelPhoto from '../components/pantry/NutritionLabelPhoto'
import OpenFoodFactsDetails from '../components/common/OpenFoodFactsDetails'
import { FOOD_CATEGORIES, FOOD_CATEGORY_BY_ID } from '../data/foodCategories'
import type { PantryItem, PantryUnit, FoodSource, FoodCategory } from '../types'

interface PendingFood {
  barcode?: string | null
  name: string
  brand?: string | null
  quantity?: string | null
  quantity_value?: number | null
  quantity_unit?: PantryUnit | null
  package_piece_count?: number | null
  package_net_quantity_value?: number | null
  package_net_quantity_unit?: 'g' | 'ml' | null
  serving_size?: string | null
  image_url?: string | null
  ingredients?: string | null
  allergens?: string | null
  traces?: string | null
  labels?: string[]
  categories?: string[]
  calories_100g: number
  protein_100g: number
  carbs_100g: number
  fat_100g: number
  category: FoodCategory
  food_key: string | null
  source: FoodSource
  off_food_id: string | null
  off_data?: Record<string, unknown> | null
  fiber_100g?: number | null
  sugars_100g?: number | null
  saturated_fat_100g?: number | null
  unsaturated_fat_100g?: number | null
  salt_100g?: number | null
  nutrition_score?: number | null
  nutrition_grade?: string | null
  nova_group?: number | null
  ecoscore_grade?: string | null
  nutrition_basis?: NutritionBasis
  analysis_confidence?: AnalysisConfidence
  analysis_warnings?: string[]
  analysis_validation_errors?: string[]
  analysis_requires_review?: boolean
  analysis_confirmation_token?: string | null
  analysis_raw_extraction?: Record<string, unknown> | null
}

type Mode = 'list' | 'choose' | 'scan' | 'photo' | 'search' | 'manual' | 'quantity'

const UNIT_LABELS: Record<PantryUnit, string> = { g: 'grammi', ml: 'millilitri', pz: 'pezzi' }

const PHOTO_NUTRIENT_FIELDS = [
  { key: 'calories_100g', label: 'Calorie', unit: 'kcal' },
  { key: 'protein_100g', label: 'Proteine', unit: 'g' },
  { key: 'carbs_100g', label: 'Carboidrati totali', unit: 'g' },
  { key: 'fat_100g', label: 'Grassi totali', unit: 'g' },
  { key: 'fiber_100g', label: 'Fibre', unit: 'g' },
  { key: 'sugars_100g', label: 'di cui zuccheri', unit: 'g' },
  { key: 'saturated_fat_100g', label: 'di cui grassi saturi', unit: 'g' },
  { key: 'salt_100g', label: 'Sale', unit: 'g' },
] as const

function manualNutritionError(food: Pick<PendingFood,
  'calories_100g' | 'protein_100g' | 'carbs_100g' | 'fat_100g'
  | 'fiber_100g' | 'sugars_100g' | 'saturated_fat_100g' | 'salt_100g'>): string | null {
  if (PHOTO_NUTRIENT_FIELDS.some(({ key }) => {
    const value = food[key]
    return value != null && (!Number.isFinite(value) || value < 0)
  })) return 'I valori nutrizionali devono essere numeri non negativi'
  if ((food.saturated_fat_100g != null && food.saturated_fat_100g > food.fat_100g)
    || (food.sugars_100g != null && food.sugars_100g > food.carbs_100g)) {
    return 'Grassi saturi e zuccheri non possono superare i rispettivi totali'
  }
  return null
}

function aiPhotoMetadata(food: PendingFood): Record<string, unknown> {
  return {
    source: 'openai_nutrition_label',
    confirmed_by_user: true,
    barcode: normalizeBarcode(food.barcode),
    brand: food.brand ?? null,
    package_quantity: food.quantity ?? null,
    package_piece_count: food.package_piece_count ?? null,
    package_net_quantity_value: food.package_net_quantity_value ?? null,
    package_net_quantity_unit: food.package_net_quantity_unit ?? null,
    serving_size: food.serving_size ?? null,
    ingredients: food.ingredients ?? null,
    allergens: food.allergens ?? null,
    nutrition_basis: food.nutrition_basis ?? 'unavailable',
    confidence: food.analysis_confidence ?? 'low',
    warnings: food.analysis_warnings ?? [],
    validation_errors: food.analysis_validation_errors ?? [],
    raw_extraction: food.analysis_raw_extraction ?? null,
  }
}

function storedAiPhotoFields(item: PantryItem): Partial<PendingFood> {
  if (item.source !== 'ai_photo' || !item.off_data) return {}
  const data = item.off_data
  const nutritionBasis = ['per_100g', 'per_100ml', 'normalized_from_serving', 'unavailable']
    .includes(String(data.nutrition_basis)) ? data.nutrition_basis as NutritionBasis : undefined
  const confidence = ['high', 'medium', 'low'].includes(String(data.confidence))
    ? data.confidence as AnalysisConfidence : undefined
  return {
    brand: typeof data.brand === 'string' ? data.brand : null,
    quantity: typeof data.package_quantity === 'string' ? data.package_quantity : null,
    package_piece_count: typeof data.package_piece_count === 'number' ? data.package_piece_count : null,
    package_net_quantity_value: typeof data.package_net_quantity_value === 'number' ? data.package_net_quantity_value : null,
    package_net_quantity_unit: data.package_net_quantity_unit === 'g' || data.package_net_quantity_unit === 'ml'
      ? data.package_net_quantity_unit
      : null,
    serving_size: typeof data.serving_size === 'string' ? data.serving_size : null,
    ingredients: typeof data.ingredients === 'string' ? data.ingredients : null,
    allergens: typeof data.allergens === 'string' ? data.allergens : null,
    nutrition_basis: nutritionBasis,
    analysis_confidence: confidence,
    analysis_warnings: Array.isArray(data.warnings)
      ? data.warnings.filter((warning): warning is string => typeof warning === 'string')
      : [],
  }
}

function openFoodFactsMetadata(metadata: Record<string, unknown> | null): Partial<PendingFood> {
  if (!metadata) return {}
  const stringValue = (key: string): string | null => {
    const value = metadata[key]
    return typeof value === 'string' && value.trim() ? value.trim() : null
  }
  const numberValue = (key: string): number | null => {
    const value = metadata[key]
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  }
  const tagValues = (key: string): string[] => {
    const value = metadata[key]
    return Array.isArray(value)
      ? value.filter((tag): tag is string => typeof tag === 'string').map(tag => tag.replace(/^[a-z]{2}:/i, ''))
      : []
  }
  return {
    image_url: stringValue('image_front_url'),
    traces: stringValue('traces'),
    labels: tagValues('labels_tags'),
    categories: tagValues('categories_tags'),
    nutrition_score: numberValue('nutriscore_score'),
    nutrition_grade: stringValue('nutriscore_grade') ?? stringValue('nutrition_grade_fr'),
    nova_group: numberValue('nova_group'),
    ecoscore_grade: stringValue('ecoscore_grade'),
  }
}

export default function PantryPage({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth()
  const { showToast } = useData()
  const [items, setItems] = useState<PantryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('list')
  const [pending, setPending] = useState<PendingFood | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState<PantryUnit>('pz')
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanLoading, setScanLoading] = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null)
  const [analysisReviewAcknowledged, setAnalysisReviewAcknowledged] = useState(false)
  const [savingItem, setSavingItem] = useState(false)
  const addInProgressRef = useRef(false)

  const [query, setQuery] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualCal, setManualCal] = useState(0)
  const [manualProt, setManualProt] = useState(0)
  const [manualCarbs, setManualCarbs] = useState(0)
  const [manualFat, setManualFat] = useState(0)
  const [manualSaturatedFat, setManualSaturatedFat] = useState<number | null>(null)
  const [manualSugars, setManualSugars] = useState<number | null>(null)
  const [manualSalt, setManualSalt] = useState<number | null>(null)
  const [manualFiber, setManualFiber] = useState<number | null>(null)
  const [manualCategory, setManualCategory] = useState<FoodCategory>('other')
  const [listQuery, setListQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<FoodCategory | 'all'>('all')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await api.getPantryItems())
    } catch {
      showToast('Errore caricamento dispensa')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { refresh() }, [refresh])

  function resetAddFlow() {
    setMode('list')
    setPending(null)
    setEditingItemId(null)
    setQuery('')
    setScanError(null)
    setScannedBarcode(null)
    setAnalysisReviewAcknowledged(false)
    setManualName(''); setManualCal(0); setManualProt(0); setManualCarbs(0); setManualFat(0)
    setManualSaturatedFat(null); setManualSugars(null); setManualSalt(null); setManualFiber(null)
    setManualCategory('other')
  }

  function goToQuantity(food: PendingFood, defaultUnit: PantryUnit, defaultQuantity?: number) {
    setEditingItemId(null)
    setPending(food)
    setUnit(defaultUnit)
    setQuantity(defaultQuantity ?? (defaultUnit === 'pz' ? 1 : 100))
    setMode('quantity')
  }

  function editPantryItem(item: PantryItem) {
    const category = FOOD_CATEGORY_BY_ID[item.category] ? item.category : 'other'
    setEditingItemId(item.id)
    setPending({
      name: item.name,
      calories_100g: item.calories_100g,
      protein_100g: item.protein_100g,
      carbs_100g: item.carbs_100g,
      fat_100g: item.fat_100g,
      category,
      food_key: item.food_key,
      source: item.source,
      off_food_id: item.off_food_id,
      barcode: item.barcode ?? null,
      off_data: item.off_data,
      fiber_100g: item.fiber_100g,
      sugars_100g: item.sugars_100g,
      saturated_fat_100g: item.saturated_fat_100g,
      unsaturated_fat_100g: item.unsaturated_fat_100g,
      salt_100g: item.salt_100g,
      nutrition_score: item.nutrition_score,
      nutrition_grade: item.nutrition_grade,
      nova_group: item.nova_group,
      ecoscore_grade: item.ecoscore_grade,
      ...storedAiPhotoFields(item),
    })
    setQuantity(item.quantity)
    setUnit(item.unit)
    setAnalysisReviewAcknowledged(true)
    setMode('quantity')
  }

  async function handleScan(code: string) {
    setScanLoading(true)
    setScanError(null)
    const barcode = normalizeBarcode(code)
    setScannedBarcode(barcode)
    try {
      if (!barcode) {
        setScanError('Codice a barre non valido. Riprova la scansione.')
        return
      }
      const product = await resolveBarcodeProduct(barcode)
      if (!product) {
        setScanError('Prodotto non presente nel catalogo condiviso né su Open Food Facts. Fotografa l’etichetta per registrarlo.')
        return
      }
      handlePhotoAnalysis(barcodeProductToAnalysis(product))
    } catch {
      setScanError('Errore nel recupero dati prodotto.')
    } finally {
      setScanLoading(false)
    }
  }

  function handlePhotoAnalysis(analysis: NutritionLabelAnalysis) {
    const draft = analysisToPantryDraft(analysis)
    const warnings = [...draft.warnings]
    if (draft.nutritionBasis === 'unavailable' && !warnings.some(warning => warning.includes('100'))) {
      warnings.push('I valori per 100 g/ml non erano leggibili: completali manualmente prima di salvare.')
    }
    if (draft.confidence === 'low' && warnings.length === 0) {
      warnings.push('La lettura della foto è poco affidabile: verifica tutti i campi.')
    }
    const defaultUnit = draft.quantityUnit
      ?? (draft.category === 'beverage' || draft.category === 'alcohol' ? 'ml' : 'g')
    const quantityLabel = draft.quantityLabel
      ?? (draft.quantityValue && draft.quantityUnit ? `${draft.quantityValue} ${draft.quantityUnit}` : null)

    if (draft.cacheHit) showToast('Prodotto recuperato dal catalogo condiviso')
    setAnalysisReviewAcknowledged(!draft.requiresReview)

    goToQuantity({
      barcode: draft.barcode,
      name: draft.name,
      brand: draft.brand,
      quantity: quantityLabel,
      quantity_value: draft.quantityValue,
      quantity_unit: draft.quantityUnit,
      package_piece_count: draft.packagePieceCount,
      package_net_quantity_value: draft.packageNetQuantityValue,
      package_net_quantity_unit: draft.packageNetQuantityUnit,
      serving_size: draft.servingSize,
      ingredients: draft.ingredients,
      allergens: draft.allergens,
      calories_100g: draft.calories100,
      protein_100g: draft.protein100g,
      carbs_100g: draft.carbs100g,
      fat_100g: draft.fat100g,
      fiber_100g: draft.fiber100g,
      sugars_100g: draft.sugars100g,
      saturated_fat_100g: draft.saturatedFat100g,
      unsaturated_fat_100g: draft.unsaturatedFat100g,
      salt_100g: draft.salt100g,
      category: draft.category,
      food_key: null,
      source: draft.source,
      off_food_id: draft.offFoodId,
      off_data: draft.metadata,
      ...(draft.source === 'openfoodfacts' ? openFoodFactsMetadata(draft.metadata) : {}),
      nutrition_basis: draft.nutritionBasis,
      analysis_confidence: draft.confidence,
      analysis_warnings: warnings,
      analysis_validation_errors: draft.validationErrors,
      analysis_requires_review: draft.requiresReview,
      analysis_confirmation_token: draft.confirmationToken,
      analysis_raw_extraction: draft.rawExtraction,
    }, defaultUnit, draft.quantityValue ?? undefined)
  }

  function handleManualConfirm() {
    if (!manualName.trim()) return
    const nutritionError = manualNutritionError({
      calories_100g: manualCal, protein_100g: manualProt, carbs_100g: manualCarbs, fat_100g: manualFat,
      saturated_fat_100g: manualSaturatedFat, sugars_100g: manualSugars,
      salt_100g: manualSalt, fiber_100g: manualFiber,
    })
    if (nutritionError) {
      showToast(nutritionError)
      return
    }
    goToQuantity({
      name: manualName.trim(),
      calories_100g: manualCal,
      protein_100g: manualProt,
      carbs_100g: manualCarbs,
      fat_100g: manualFat,
      category: manualCategory,
      food_key: null,
      source: 'manual',
      off_food_id: null,
      off_data: null,
      fiber_100g: manualFiber,
      sugars_100g: manualSugars,
      saturated_fat_100g: manualSaturatedFat,
      unsaturated_fat_100g: null,
      salt_100g: manualSalt,
      nutrition_score: null,
      nutrition_grade: null,
      nova_group: null,
      ecoscore_grade: null,
    }, 'g')
  }

  async function handleAddToPantry() {
    if (!pending || !user || !pending.name.trim() || addInProgressRef.current) return
    if (pending.source === 'manual') {
      const nutritionError = manualNutritionError(pending)
      if (nutritionError) {
        showToast(nutritionError)
        return
      }
    }
    addInProgressRef.current = true
    setSavingItem(true)
    try {
      const pantryValues: Omit<PantryItem, 'id' | 'user_id' | 'created_at'> = {
        name: pending.name.trim(),
        quantity,
        unit,
        calories_100g: pending.calories_100g,
        protein_100g: pending.protein_100g,
        carbs_100g: pending.carbs_100g,
        fat_100g: pending.fat_100g,
        category: pending.category,
        food_key: pending.food_key,
        source: pending.source,
        off_food_id: pending.off_food_id,
        barcode: normalizeBarcode(pending.barcode),
        off_data: pending.source === 'ai_photo' ? aiPhotoMetadata(pending) : pending.off_data ?? null,
        fiber_100g: pending.fiber_100g ?? null,
        sugars_100g: pending.sugars_100g ?? null,
        saturated_fat_100g: pending.saturated_fat_100g ?? null,
        unsaturated_fat_100g: pending.unsaturated_fat_100g ?? null,
        salt_100g: pending.salt_100g ?? null,
        nutrition_score: pending.nutrition_score ?? null,
        nutrition_grade: pending.nutrition_grade ?? null,
        nova_group: pending.nova_group ?? null,
        ecoscore_grade: pending.ecoscore_grade ?? null,
      }
      try {
        if (editingItemId) {
          await api.updatePantryItem(editingItemId, pantryValues)
        } else {
          await api.addPantryItem({
            user_id: user.id,
            ...pantryValues,
          })
        }
      } catch {
        showToast('Errore aggiunta articolo')
        return
      }

      let catalogSaveFailed = false
      if (
        pending.source === 'ai_photo'
        && pantryValues.barcode
        && pending.analysis_confirmation_token
      ) {
        try {
          await confirmBarcodeProduct({
            confirmation_token: pending.analysis_confirmation_token,
            barcode: pantryValues.barcode,
            name: pantryValues.name,
            brand: pending.brand?.trim() || null,
            package_quantity: pending.quantity?.trim() || null,
            package_piece_count: pending.package_piece_count ?? null,
            package_net_quantity_value: pending.package_net_quantity_value ?? null,
            package_net_quantity_unit: pending.package_net_quantity_unit ?? null,
            serving_size: pending.serving_size?.trim() || null,
            ingredients: pending.ingredients?.trim() || null,
            allergens: pending.allergens?.trim() || null,
            calories_100g: pantryValues.calories_100g,
            protein_100g: pantryValues.protein_100g,
            carbs_100g: pantryValues.carbs_100g,
            fat_100g: pantryValues.fat_100g,
            fiber_100g: pantryValues.fiber_100g ?? null,
            sugars_100g: pantryValues.sugars_100g ?? null,
            saturated_fat_100g: pantryValues.saturated_fat_100g ?? null,
            unsaturated_fat_100g: pantryValues.unsaturated_fat_100g ?? null,
            salt_100g: pantryValues.salt_100g ?? null,
            category: pantryValues.category,
            nutrition_basis: pending.nutrition_basis ?? 'unavailable',
            confidence: pending.analysis_confidence ?? 'low',
            warnings: pending.analysis_warnings ?? [],
            raw_extraction: pending.analysis_raw_extraction ?? null,
          })
        } catch {
          catalogSaveFailed = true
        }
      }
      showToast(catalogSaveFailed
        ? 'Salvato in dispensa, ma il catalogo condiviso non è stato aggiornato'
        : editingItemId ? 'Ingrediente aggiornato' : 'Aggiunto alla dispensa')
      resetAddFlow()
      await refresh()
    } finally {
      addInProgressRef.current = false
      setSavingItem(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deletePantryItem(id)
      await refresh()
    } catch {
      showToast('Errore eliminazione articolo')
    }
  }

  const basicResults = query.trim() ? searchBasicFoods(query) : []
  const visibleItems = items.filter(item => {
    const matchesText = item.name.toLowerCase().includes(listQuery.trim().toLowerCase())
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    return matchesText && matchesCategory
  })
  const groupedItems = FOOD_CATEGORIES.map(category => ({
    ...category,
    items: visibleItems.filter(item => item.category === category.id),
  })).filter(group => group.items.length > 0)

  return (
    <div className={embedded ? 'space-y-4' : 'p-4 pb-24 space-y-4'}>
      {!embedded && <h1 className="text-lg font-semibold">Dispensa</h1>}

      {mode === 'list' && (
        <>
          <button type="button" onClick={() => setMode('choose')}
            className="w-full rounded-2xl bg-primary-500 py-3.5 font-semibold shadow-lg shadow-primary-950/30 hover:bg-primary-400">
            + Aggiungi ingrediente
          </button>

          <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-3">
            <input
              value={listQuery}
              onChange={event => setListQuery(event.target.value)}
              placeholder="Cerca nella dispensa..."
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm outline-none focus:border-primary-500"
            />
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              <button type="button" onClick={() => setCategoryFilter('all')}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${categoryFilter === 'all' ? 'bg-primary-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                Tutto
              </button>
              {FOOD_CATEGORIES.filter(category => items.some(item => item.category === category.id)).map(category => (
                <button key={category.id} type="button" onClick={() => setCategoryFilter(category.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${categoryFilter === category.id ? 'bg-primary-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                  {category.icon} {category.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="h-32 bg-gray-800 rounded-xl animate-pulse" />
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Dispensa vuota. Scansiona un prodotto o aggiungilo a mano.</p>
          ) : visibleItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">Nessun ingrediente corrisponde ai filtri.</p>
          ) : (
            <div className="space-y-5">
              {groupedItems.map(group => (
                <section key={group.id}>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{group.icon} {group.label}</h3>
                    <span className="text-xs text-gray-600">{group.items.length}</span>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-800/55 divide-y divide-gray-700/60">
                    {group.items.map(item => (
                      <div key={item.id} className="flex items-center pr-4 hover:bg-gray-700/50">
                        <button type="button" onClick={() => editPantryItem(item)}
                          aria-label={`Modifica ${item.name}`}
                          className="min-w-0 flex-1 py-3 pl-4 pr-3 text-left">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            {item.quantity} {UNIT_LABELS[item.unit]} · {Math.round(item.calories_100g)} kcal/100{item.unit === 'ml' ? 'ml' : 'g'}
                          </p>
                        </button>
                        <button type="button" onClick={() => { void handleDelete(item.id) }}
                          className="flex h-11 w-11 shrink-0 items-center justify-center text-lg text-gray-600 hover:text-red-400"
                          aria-label={`Rimuovi ${item.name}`}>✕</button>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {mode === 'choose' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <button type="button" onClick={() => { setScannedBarcode(null); setMode('scan') }}
              className="py-4 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-medium">
              📷 Scansiona codice a barre
            </button>
            <button type="button" onClick={() => { setScannedBarcode(null); setMode('photo') }}
              className="py-4 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-medium">
              📸 Foto confezione o etichetta
            </button>
            <button type="button" onClick={() => setMode('search')}
              className="py-4 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-medium">
              🔍 Cerca alimento base
            </button>
            <button type="button" onClick={() => setMode('manual')}
              className="py-4 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-medium">
              ✏️ Inserisci a mano
            </button>
          </div>
          <button type="button" onClick={resetAddFlow} className="text-sm text-gray-500 text-center w-full">
            Annulla
          </button>
        </div>
      )}

      {mode === 'scan' && (
        <div className="space-y-3">
          {scanLoading ? (
            <p className="text-sm text-gray-500 text-center py-6">Cerco il prodotto...</p>
          ) : (
            <BarcodeScanner onScan={handleScan} onCancel={() => setMode('choose')} />
          )}
          {scanError && (
            <div className="space-y-2">
              <p className="text-sm text-orange-400">{scanError}</p>
              {scannedBarcode && (
                <button type="button" onClick={() => setMode('photo')}
                  className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold hover:bg-primary-500">
                  Fotografa etichetta
                </button>
              )}
              <button type="button" onClick={() => setMode('search')}
                className="w-full py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm">
                Cerca manualmente
              </button>
            </div>
          )}
        </div>
      )}

      {mode === 'photo' && (
        <NutritionLabelPhoto
          knownBarcode={scannedBarcode}
          onAnalysis={handlePhotoAnalysis}
          onCancel={() => setMode('choose')}
        />
      )}

      {mode === 'search' && (
        <div className="space-y-3">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cerca alimento base..."
            className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 outline-none focus:border-primary-500"
          />
          <div className="max-h-64 overflow-y-auto space-y-1">
            {basicResults.map(f => (
              <button key={f.id} type="button"
                onClick={() => goToQuantity({
                  name: f.name, calories_100g: f.calories_100g, protein_100g: f.protein_100g,
                  carbs_100g: f.carbs_100g, fat_100g: f.fat_100g, category: f.category,
                  food_key: f.food_key, source: 'basic', off_food_id: null,
                }, f.category === 'beverage' || f.category === 'alcohol' ? 'ml' : 'g')}
                className="w-full text-left px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm">
                <span className="font-medium">{f.name}</span>
                <span className="text-gray-500 ml-2">{Math.round(f.calories_100g)} kcal/100g</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setMode('choose')} className="text-sm text-gray-500 text-center w-full">
            Annulla
          </button>
        </div>
      )}

      {mode === 'manual' && (
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-400" htmlFor="manual-food-name">Nome alimento</label>
            <input id="manual-food-name" value={manualName} onChange={e => setManualName(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded bg-gray-700 border border-gray-600 outline-none" />
          </div>
          <div>
            <label className="text-sm text-gray-400">Categoria</label>
            <select value={manualCategory} onChange={event => setManualCategory(event.target.value as FoodCategory)}
              className="mt-1 w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 outline-none">
              {FOOD_CATEGORIES.map(category => (
                <option key={category.id} value={category.id}>{category.icon} {category.label}</option>
              ))}
            </select>
          </div>
          {[
            { label: 'Calorie (kcal/100g)', val: manualCal, set: setManualCal },
            { label: 'Proteine (g/100g)', val: manualProt, set: setManualProt },
            { label: 'Carboidrati totali (g/100g)', val: manualCarbs, set: setManualCarbs },
            { label: 'Grassi totali (g/100g)', val: manualFat, set: setManualFat },
          ].map(({ label, val, set }) => (
            <label key={label} className="block text-sm text-gray-400">
              {label}
              <input type="number" min={0} value={val || ''}
                onChange={e => set(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded bg-gray-700 border border-gray-600 outline-none" />
            </label>
          ))}
          <div>
            <p className="text-sm text-gray-400">Altri valori per 100 g (facoltativi)</p>
            <p className="mt-1 text-xs text-gray-500">Saturi e zuccheri sono già compresi nei rispettivi totali.</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {[
                { label: 'di cui grassi saturi (g/100g)', val: manualSaturatedFat, set: setManualSaturatedFat },
                { label: 'di cui zuccheri (g/100g)', val: manualSugars, set: setManualSugars },
                { label: 'Sale (g/100g)', val: manualSalt, set: setManualSalt },
                { label: 'Fibre (g/100g)', val: manualFiber, set: setManualFiber },
              ].map(({ label, val, set }) => (
                <label key={label} className="min-w-0 text-xs text-gray-400">
                  {label}
                  <input type="number" min={0} step="any" inputMode="decimal" value={val ?? ''}
                    onChange={event => set(event.target.value === '' ? null : Number(event.target.value))}
                    className="mt-1 w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-sm outline-none focus:border-primary-500" />
                </label>
              ))}
            </div>
          </div>
          <button type="button" onClick={handleManualConfirm} disabled={!manualName.trim()}
            className="w-full py-3 bg-primary-600 rounded-lg font-semibold disabled:opacity-40">
            Continua
          </button>
          <button type="button" onClick={() => setMode('choose')} className="text-sm text-gray-500 text-center w-full">
            Annulla
          </button>
        </div>
      )}

      {mode === 'quantity' && pending && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-gray-800 p-4">
            <p className="text-xs text-gray-500">{FOOD_CATEGORY_BY_ID[pending.category]?.icon ?? FOOD_CATEGORY_BY_ID.other.icon} {FOOD_CATEGORY_BY_ID[pending.category]?.label ?? FOOD_CATEGORY_BY_ID.other.label}</p>
            <label className="mt-2 block text-sm text-gray-400" htmlFor="pending-food-name">Nome alimento</label>
            <input
              id="pending-food-name"
              value={pending.name}
              onChange={event => setPending({ ...pending, name: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 outline-none focus:border-primary-500"
            />
            {pending.off_data && pending.source !== 'ai_photo' && <div className="mt-3"><OpenFoodFactsDetails food={pending} /></div>}
          </div>
          {pending.source === 'ai_photo' && (
            <div className="space-y-4 rounded-2xl border border-primary-900/70 bg-primary-950/15 p-4">
              <div>
                <p className="text-sm font-semibold text-primary-300">Controlla i dati letti dalla foto</p>
                <p className="mt-1 text-xs text-gray-400">
                  L’AI può sbagliare: confronta soprattutto calorie e valori per 100 {pending.nutrition_basis === 'per_100ml' ? 'ml' : 'g'} con l’etichetta.
                </p>
              </div>
              {pending.analysis_requires_review && (
                <div className="rounded-xl border border-red-800/70 bg-red-950/30 p-3 text-xs text-red-200">
                  <p className="font-semibold">Controlli automatici non superati</p>
                  <p className="mt-1">Correggi i campi confrontandoli con l’etichetta, poi conferma la revisione.</p>
                  {pending.analysis_validation_errors && pending.analysis_validation_errors.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {pending.analysis_validation_errors.map((error, index) => <li key={`${error}-${index}`}>• {error}</li>)}
                    </ul>
                  )}
                </div>
              )}
              {pending.analysis_warnings && pending.analysis_warnings.length > 0 && (
                <ul className="space-y-1 rounded-xl bg-orange-950/30 p-3 text-xs text-orange-300">
                  {pending.analysis_warnings.map((warning, index) => <li key={`${warning}-${index}`}>• {warning}</li>)}
                </ul>
              )}
              <div>
                <label className="text-sm text-gray-400" htmlFor="pending-brand">Marca</label>
                <input id="pending-brand" value={pending.brand ?? ''}
                  onChange={event => setPending({ ...pending, brand: event.target.value || null })}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400" htmlFor="pending-package-label">Confezione indicata</label>
                <input id="pending-package-label" value={pending.quantity ?? ''}
                  onChange={event => setPending({ ...pending, quantity: event.target.value || null })}
                  placeholder="es. 10 uova oppure 500 g"
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 outline-none focus:border-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-gray-400">
                  Pezzi per confezione
                  <input type="number" min={1} step={1} value={pending.package_piece_count ?? ''}
                    onChange={event => {
                      const value = event.target.value ? Math.max(1, Math.round(Number(event.target.value))) : null
                      setPending({ ...pending, package_piece_count: value })
                      if (value !== null && !editingItemId) { setQuantity(value); setUnit('pz') }
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm outline-none focus:border-primary-500" />
                </label>
                <label className="text-xs text-gray-400">
                  Peso/volume netto
                  <input type="number" min={0} step="any" value={pending.package_net_quantity_value ?? ''}
                    onChange={event => {
                      const value = event.target.value ? Math.max(0, Number(event.target.value)) : null
                      setPending({ ...pending, package_net_quantity_value: value })
                      if (value !== null && !pending.package_piece_count && !editingItemId) {
                        setQuantity(value)
                        setUnit(pending.package_net_quantity_unit ?? 'g')
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm outline-none focus:border-primary-500" />
                </label>
              </div>
              <div>
                <label className="text-xs text-gray-400" htmlFor="pending-net-unit">Unità peso/volume netto</label>
                <select id="pending-net-unit" value={pending.package_net_quantity_unit ?? ''}
                  onChange={event => {
                    const value = event.target.value === 'g' || event.target.value === 'ml' ? event.target.value : null
                    setPending({ ...pending, package_net_quantity_unit: value })
                    if (value && pending.package_net_quantity_value && !pending.package_piece_count && !editingItemId) setUnit(value)
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 outline-none focus:border-primary-500">
                  <option value="">Non indicata</option>
                  <option value="g">grammi</option>
                  <option value="ml">millilitri</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400" htmlFor="pending-serving">Porzione indicata</label>
                <input id="pending-serving" value={pending.serving_size ?? ''}
                  onChange={event => setPending({ ...pending, serving_size: event.target.value || null })}
                  placeholder="es. 30 g"
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400" htmlFor="pending-ingredients">Ingredienti</label>
                <textarea id="pending-ingredients" value={pending.ingredients ?? ''} rows={3}
                  onChange={event => setPending({ ...pending, ingredients: event.target.value || null })}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400" htmlFor="pending-allergens">Allergeni</label>
                <input id="pending-allergens" value={pending.allergens ?? ''}
                  onChange={event => setPending({ ...pending, allergens: event.target.value || null })}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 outline-none focus:border-primary-500" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Valori nutrizionali per 100 {pending.nutrition_basis === 'per_100ml' ? 'ml' : 'g'}</p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {PHOTO_NUTRIENT_FIELDS.map(field => (
                    <label key={field.key} className="text-xs text-gray-400">
                      {field.label} ({field.unit})
                      <input type="number" min={0} step="any" value={pending[field.key] || ''}
                        onChange={event => setPending({
                          ...pending,
                          [field.key]: Math.max(0, Number(event.target.value) || 0),
                        })}
                        className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm outline-none focus:border-primary-500" />
                    </label>
                  ))}
                </div>
              </div>
              {pending.analysis_requires_review && (
                <label className="flex items-start gap-2 rounded-xl border border-gray-700 bg-gray-900/50 p-3 text-xs text-gray-300">
                  <input type="checkbox" checked={analysisReviewAcknowledged}
                    onChange={event => setAnalysisReviewAcknowledged(event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-primary-500" />
                  Ho confrontato e corretto i valori segnalati usando la confezione.
                </label>
              )}
            </div>
          )}
          {pending.source === 'manual' && editingItemId && (
            <div className="rounded-2xl bg-gray-800 p-4">
              <p className="text-sm text-gray-400">Valori nutrizionali per 100 g</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {PHOTO_NUTRIENT_FIELDS.map(field => (
                  <label key={field.key} className="min-w-0 text-xs text-gray-400">
                    {field.label} ({field.unit})
                    <input type="number" min={0} step="any" inputMode="decimal" value={pending[field.key] ?? ''}
                      onChange={event => setPending({
                        ...pending,
                        [field.key]: event.target.value === '' && field.key !== 'calories_100g'
                          && field.key !== 'protein_100g' && field.key !== 'carbs_100g' && field.key !== 'fat_100g'
                          ? null : Number(event.target.value),
                      })}
                      className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm outline-none focus:border-primary-500" />
                  </label>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="text-sm text-gray-400" htmlFor="pending-barcode">Codice a barre</label>
            <input
              id="pending-barcode"
              inputMode="numeric"
              value={pending.barcode ?? ''}
              onChange={event => setPending({ ...pending, barcode: event.target.value || null })}
              placeholder="EAN / UPC (facoltativo)"
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 outline-none focus:border-primary-500"
            />
            {pending.barcode && !normalizeBarcode(pending.barcode) && (
              <p className="mt-1 text-xs text-orange-400">Inserisci un codice numerico di 8, 12, 13 o 14 cifre.</p>
            )}
          </div>
          <div>
            <label className="text-sm text-gray-400">Quantità totale in dispensa</label>
            <input type="number" min={0} value={quantity === 0 ? '' : quantity}
              onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full mt-1 px-3 py-2 rounded bg-gray-700 border border-gray-600 outline-none" />
            {pending.quantity && !editingItemId && (
              <p className="mt-1 text-xs text-gray-500">Precompilata dalla confezione rilevata: {pending.quantity}</p>
            )}
          </div>
          <div>
            <label className="text-sm text-gray-400">Unità</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {(['g', 'ml', 'pz'] as const).map(u => (
                <button key={u} type="button" onClick={() => setUnit(u)}
                  className={`py-2 rounded-lg text-sm font-medium ${unit === u ? 'bg-primary-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                  {UNIT_LABELS[u]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400">Categoria</label>
            <select
              value={pending.category}
              onChange={event => setPending({ ...pending, category: event.target.value as FoodCategory })}
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 outline-none focus:border-primary-500"
            >
              {FOOD_CATEGORIES.map(category => (
                <option key={category.id} value={category.id}>{category.icon} {category.label}</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={handleAddToPantry}
            disabled={savingItem
              || quantity <= 0
              || !pending.name.trim()
              || Boolean(pending.barcode && !normalizeBarcode(pending.barcode))
              || Boolean(pending.analysis_requires_review && !analysisReviewAcknowledged)}
            className="w-full py-3 bg-primary-600 rounded-lg font-semibold disabled:opacity-40">
            {savingItem ? 'Salvataggio…' : editingItemId ? 'Salva modifiche' : 'Aggiungi alla dispensa'}
          </button>
          <button type="button" onClick={resetAddFlow} disabled={savingItem}
            className="text-sm text-gray-500 text-center w-full disabled:opacity-40">
            Annulla
          </button>
        </div>
      )}
    </div>
  )
}
