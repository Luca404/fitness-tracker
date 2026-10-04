import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import * as api from '../services/api'
import { searchBasicFoods } from '../services/nutrition'
import { normalizeBarcode, resolveBarcodeProduct } from '../services/barcodeProducts'
import { analysisToPantryDraft, barcodeProductToAnalysis, confirmBarcodeProduct } from '../services/nutritionLabel'
import type { NutritionLabelAnalysis } from '../services/nutritionLabel'
import PantryReview from '../components/pantry/PantryReview'
import { NutrientNumberInput } from '../components/pantry/PantryNutritionFields'
import { manualNutritionError, pantryValues, storedAiPhotoFields, openFoodFactsMetadata } from '../utils/pantryDraft'
import type { PendingFood } from '../utils/pantryDraft'

const BarcodeScanner = lazy(() => import('../components/pantry/BarcodeScanner'))
const NutritionLabelPhoto = lazy(() => import('../components/pantry/NutritionLabelPhoto'))
import { FOOD_CATEGORIES, FOOD_CATEGORY_BY_ID } from '../data/foodCategories'
import type { PantryItem, FoodCategory } from '../types'
import { validAlcoholStrength } from '../utils/alcohol'
import { formatDecimal } from '../utils/decimal'

type Mode = 'list' | 'choose' | 'scan' | 'photo' | 'search' | 'manual'
type Flow = { mode: Mode } | { mode: 'quantity'; pending: PendingFood; editingItemId: string | null }

export default function PantryPage({ embedded = false, onSaved, initialMode = 'list' }: {
  embedded?: boolean
  onSaved?: (item: PantryItem) => void
  initialMode?: Mode
}) {
  const { user } = useAuth()
  const { showToast, refreshDiary } = useData()
  const [items, setItems] = useState<PantryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [flow, setFlow] = useState<Flow>({ mode: initialMode })
  const mode = flow.mode
  const pending = flow.mode === 'quantity' ? flow.pending : null
  const editingItemId = flow.mode === 'quantity' ? flow.editingItemId : null
  function setMode(mode: Mode) { setFlow({ mode }) }
  function setPending(pending: PendingFood) {
    setFlow(previous => previous.mode === 'quantity' ? { ...previous, pending } : previous)
  }
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
      showToast('Errore caricamento ingredienti')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { refresh() }, [refresh])

  function resetAddFlow() {
    setMode('list')
    setQuery('')
    setScanError(null)
    setScannedBarcode(null)
    setAnalysisReviewAcknowledged(false)
    setManualName(''); setManualCal(0); setManualProt(0); setManualCarbs(0); setManualFat(0)
    setManualSaturatedFat(null); setManualSugars(null); setManualSalt(null); setManualFiber(null)
    setManualCategory('other')
  }

  function goToReview(food: PendingFood) {
    setFlow({ mode: 'quantity', pending: food, editingItemId: null })
  }

  function editPantryItem(item: PantryItem) {
    const category = FOOD_CATEGORY_BY_ID[item.category] ? item.category : 'other'
    setFlow({ mode: 'quantity', editingItemId: item.id, pending: {
      name: item.name,
      calories_100g: item.calories_100g,
      protein_100g: item.protein_100g,
      carbs_100g: item.carbs_100g,
      fat_100g: item.fat_100g,
      category,
      alcohol_abv: item.alcohol_abv ?? null,
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
      nutrition_basis: item.nutrition_unit === 'ml' ? 'per_100ml' : 'per_100g',
      ...storedAiPhotoFields(item),
    } })
    setAnalysisReviewAcknowledged(true)
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
    const quantityLabel = draft.quantityLabel
      ?? (draft.quantityValue && draft.quantityUnit ? `${formatDecimal(draft.quantityValue)} ${draft.quantityUnit}` : null)

    if (draft.cacheHit) showToast('Prodotto recuperato dal catalogo condiviso')
    setAnalysisReviewAcknowledged(!draft.requiresReview)

    goToReview({
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
    })
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
    goToReview({
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
    })
  }

  async function handleAddToPantry() {
    if (!pending || !user || !pending.name.trim() || addInProgressRef.current) return
    if (pending.alcohol_abv != null && !validAlcoholStrength(pending.alcohol_abv)) {
      showToast('Inserisci una gradazione tra 0 e 100')
      return
    }
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
      const values = pantryValues(pending)
      let savedItem: PantryItem
      try {
        if (editingItemId) {
          savedItem = await api.updatePantryItem(editingItemId, values)
        } else {
          savedItem = await api.addPantryItem({
            user_id: user.id,
            ...values,
          })
        }
      } catch {
        showToast('Errore salvataggio ingrediente')
        return
      }

      let catalogSaveFailed = false
      if (
        pending.source === 'ai_photo'
        && values.barcode
        && pending.analysis_confirmation_token
      ) {
        try {
          await confirmBarcodeProduct({
            confirmation_token: pending.analysis_confirmation_token,
            barcode: values.barcode,
            name: values.name,
            brand: pending.brand?.trim() || null,
            package_quantity: pending.quantity?.trim() || null,
            package_piece_count: pending.package_piece_count ?? null,
            package_net_quantity_value: pending.package_net_quantity_value ?? null,
            package_net_quantity_unit: pending.package_net_quantity_unit ?? null,
            serving_size: pending.serving_size?.trim() || null,
            ingredients: pending.ingredients?.trim() || null,
            allergens: pending.allergens?.trim() || null,
            calories_100g: values.calories_100g,
            protein_100g: values.protein_100g,
            carbs_100g: values.carbs_100g,
            fat_100g: values.fat_100g,
            fiber_100g: values.fiber_100g ?? null,
            sugars_100g: values.sugars_100g ?? null,
            saturated_fat_100g: values.saturated_fat_100g ?? null,
            unsaturated_fat_100g: values.unsaturated_fat_100g ?? null,
            salt_100g: values.salt_100g ?? null,
            category: values.category,
            nutrition_basis: pending.nutrition_basis ?? 'unavailable',
            confidence: pending.analysis_confidence ?? 'low',
            warnings: pending.analysis_warnings ?? [],
            raw_extraction: pending.analysis_raw_extraction ?? null,
          })
        } catch {
          catalogSaveFailed = true
        }
      }
      if (editingItemId) await refreshDiary()
      showToast(catalogSaveFailed
        ? 'Ingrediente salvato, ma il catalogo condiviso non è stato aggiornato'
        : editingItemId ? 'Ingrediente aggiornato' : 'Ingrediente salvato')
      onSaved?.(savedItem)
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
      showToast('Errore eliminazione ingrediente')
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
      {!embedded && <h1 className="text-lg font-semibold">Ingredienti</h1>}

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
              placeholder="Cerca tra gli ingredienti salvati..."
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
            <p className="text-sm text-gray-500 text-center py-8">Nessun ingrediente salvato. Scansiona un prodotto o aggiungilo a mano.</p>
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
                            {formatDecimal(item.calories_100g)} kcal/100{item.nutrition_unit === 'ml' ? 'ml' : 'g'}
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
            <Suspense fallback={<p role="status">Caricamento fotocamera…</p>}><BarcodeScanner onScan={handleScan} onCancel={() => setMode('choose')} /></Suspense>
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
        <Suspense fallback={<p role="status">Caricamento foto…</p>}><NutritionLabelPhoto
          knownBarcode={scannedBarcode}
          onAnalysis={handlePhotoAnalysis}
          onCancel={() => setMode('choose')}
        /></Suspense>
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
                onClick={() => goToReview({
                  name: f.name, calories_100g: f.calories_100g, protein_100g: f.protein_100g,
                  carbs_100g: f.carbs_100g, fat_100g: f.fat_100g, category: f.category,
                  alcohol_abv: f.alcohol_abv ?? null,
                  food_key: f.food_key, source: 'basic', off_food_id: null,
                  fiber_100g: f.fiber_100g, sugars_100g: f.sugars_100g,
                  salt_100g: f.salt_100g,
                })}
                className="w-full text-left px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm">
                <span className="font-medium">{f.name}</span>
                <span className="text-gray-500 ml-2">{formatDecimal(f.calories_100g)} kcal/100{f.quantity_unit === 'ml' ? 'ml' : 'g'}</span>
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
          <p className="text-xs text-gray-500">Valori per 100 g. Gli zuccheri sono inclusi nei carboidrati e i saturi nei grassi.</p>
          <div className="grid grid-cols-2 gap-3">
            <NutrientNumberInput label="Calorie (kcal/100g)" value={manualCal} onChange={value => setManualCal(value ?? 0)} />
            <NutrientNumberInput label="Proteine (g/100g)" value={manualProt} onChange={value => setManualProt(value ?? 0)} />
          </div>
          <fieldset aria-label="Carboidrati" className="rounded-xl border border-gray-600 bg-gray-800/50 p-3">
            <NutrientNumberInput label="Carboidrati (g/100g)" value={manualCarbs} onChange={value => setManualCarbs(value ?? 0)} />
            <div className="mt-2 border-l-2 border-gray-600 pl-3">
              <NutrientNumberInput label="Zuccheri (g/100g)" value={manualSugars} onChange={setManualSugars} optional />
            </div>
          </fieldset>
          <fieldset aria-label="Grassi" className="rounded-xl border border-gray-600 bg-gray-800/50 p-3">
            <NutrientNumberInput label="Grassi (g/100g)" value={manualFat} onChange={value => setManualFat(value ?? 0)} />
            <div className="mt-2 border-l-2 border-gray-600 pl-3">
              <NutrientNumberInput label="di cui grassi saturi (g/100g)" value={manualSaturatedFat} onChange={setManualSaturatedFat} optional />
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <NutrientNumberInput label="Fibre (g/100g)" value={manualFiber} onChange={setManualFiber} optional />
            <NutrientNumberInput label="Sale (g/100g)" value={manualSalt} onChange={setManualSalt} optional />
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

      {mode === 'quantity' && pending && <PantryReview pending={pending} setPending={setPending}
        editingItemId={editingItemId} analysisReviewAcknowledged={analysisReviewAcknowledged}
        setAnalysisReviewAcknowledged={setAnalysisReviewAcknowledged} savingItem={savingItem}
        handleAddToPantry={handleAddToPantry} resetAddFlow={resetAddFlow} />}
    </div>
  )
}
