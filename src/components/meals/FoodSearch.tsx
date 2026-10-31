import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { searchBasicFoods, searchFood, calcNutrition } from '../../services/nutrition'
import * as api from '../../services/api'
import { useData } from '../../contexts/DataContext'
import { FOOD_CATEGORIES } from '../../data/foodCategories'
import type { FoodResult, FoodSource, PantryItem, FoodCategory, PieceSize } from '../../types'
import OpenFoodFactsDetails from '../common/OpenFoodFactsDetails'
import AlcoholStrengthInput from './AlcoholStrengthInput'
import { alcoholStrength, validAlcoholStrength, withAlcoholStrength } from '../../utils/alcohol'
import IngredientQuantityInput from './IngredientQuantityInput'
import NutritionFields from './NutritionFields'
import IngredientEntryActions from './IngredientEntryActions'
import { nutritionValidationError } from '../../utils/nutrition'
import { formatDecimal } from '../../utils/decimal'

const IngredientCatalog = lazy(() => import('../../pages/PantryPage'))

function pantryItemToFoodResult(p: PantryItem): FoodResult {
  return {
    id: p.id,
    name: p.name,
    brand: null,
    source: 'pantry',
    quantity_unit: p.nutrition_unit ?? 'g',
    category: p.category,
    alcohol_abv: p.alcohol_abv ?? null,
    food_key: p.food_key,
    calories_100g: p.calories_100g,
    protein_100g: p.protein_100g,
    carbs_100g: p.carbs_100g,
    fat_100g: p.fat_100g,
    fiber_100g: p.fiber_100g ?? null,
    sugars_100g: p.sugars_100g ?? null,
    saturated_fat_100g: p.saturated_fat_100g ?? null,
    unsaturated_fat_100g: p.unsaturated_fat_100g ?? null,
    salt_100g: p.salt_100g ?? null,
  }
}

interface Props {
  onAdd: (item: {
    food_name: string; quantity_g: number; calories: number
    unit?: 'g' | 'ml'
    alcohol_abv?: number | null
    protein_g: number; carbs_g: number; fat_g: number
    fiber_g: number | null; sugars_g: number | null; salt_g: number | null
    source: FoodSource; off_food_id: string | null
    category: FoodResult['category']; food_key: string | null; pantry_item_id: string | null
    piece_count?: number | null; piece_size?: PieceSize | null
  }) => void
  onClose: () => void
  hideHeader?: boolean
  allowManualEntry?: boolean
  addLabel?: string
  saving?: boolean
  resetAfterAdd?: boolean
}

export default function FoodSearch({ onAdd, onClose, hideHeader, allowManualEntry = true, addLabel = '+ Aggiungi ingrediente', saving = false, resetAfterAdd = false }: Props) {
  const { showToast } = useData()
  const [query, setQuery] = useState('')
  const [offResults, setOffResults] = useState<FoodResult[]>([])
  const [offSearched, setOffSearched] = useState(false)
  const [selected, setSelected] = useState<FoodResult | null>(null)
  const [selectedAbv, setSelectedAbv] = useState<number | null | undefined>(undefined)
  function selectFood(food: FoodResult) { setSelected(food); setSelectedAbv(undefined); setPiece(null); setQty(100); setQuantityValid(true) }
  function selectedNutrition(food: FoodResult, amount: number) {
    return withAlcoholStrength({ ...calcNutrition(food, amount), quantity_g: amount,
      unit: food.quantity_unit === 'ml' ? 'ml' as const : 'g' as const, food_key: food.food_key,
      alcohol_abv: alcoholStrength(food) }, selectedAbv === undefined ? alcoholStrength(food) : selectedAbv)
  }
  const [qty, setQty] = useState(100)
  const [quantityValid, setQuantityValid] = useState(true)
  const searchVersion = useRef(0)
  const [piece, setPiece] = useState<{ size: PieceSize; count: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [offError, setOffError] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualCal, setManualCal] = useState(0)
  const [manualProt, setManualProt] = useState(0)
  const [manualCarbs, setManualCarbs] = useState(0)
  const [manualFat, setManualFat] = useState(0)
  const [manualFiber, setManualFiber] = useState<number | null>(null)
  const [manualSugars, setManualSugars] = useState<number | null>(null)
  const [manualSalt, setManualSalt] = useState<number | null>(null)
  const [manualAbv, setManualAbv] = useState<number | null>(null)
  const [manualCategory, setManualCategory] = useState<FoodCategory>('other')
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([])
  const [importMode, setImportMode] = useState<'scan' | 'photo' | 'manual' | null>(null)

  useEffect(() => {
    api.getPantryItems().then(setPantryItems).catch(() => {
      showToast('Ingredienti salvati non disponibili')
    })
  }, [showToast])

  const basicResults = useMemo(() => searchBasicFoods(query), [query])

  const pantryResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return pantryItems.filter(p => p.name.toLowerCase().includes(q)).map(pantryItemToFoodResult)
  }, [query, pantryItems])

  async function handleOffSearch() {
    if (!query.trim()) return
    const version = ++searchVersion.current
    setLoading(true)
    setOffError(false)
    try {
      const r = await searchFood(query)
      if (version !== searchVersion.current) return
      setOffResults(r)
      setOffSearched(true)
    } catch {
      if (version === searchVersion.current) setOffError(true)
    } finally {
      if (version === searchVersion.current) setLoading(false)
    }
  }

  const manualValues = { calories: manualCal, protein_g: manualProt, carbs_g: manualCarbs, fat_g: manualFat,
    fiber_g: manualFiber, sugars_g: manualSugars, salt_g: manualSalt }
  const manualError = nutritionValidationError(manualValues)

  function startManual() {
    if (!allowManualEntry) { setImportMode('manual'); return }
    setManualName(query.trim()); setManualCal(0); setManualProt(0); setManualCarbs(0); setManualFat(0)
    setManualFiber(null); setManualSugars(null); setManualSalt(null); setManualAbv(null)
    setManualCategory('other'); setQty(100); setPiece(null); setQuantityValid(true); setManualMode(true)
  }

  function submitItem(item: Parameters<Props['onAdd']>[0]) {
    onAdd(item)
    if (resetAfterAdd) {
      searchVersion.current += 1
      setSelected(null); setQuery(''); setManualMode(false); setQty(100); setQuantityValid(true)
      setPiece(null); setOffResults([]); setOffSearched(false); setOffError(false); setLoading(false)
    }
  }

  function handleAdd() {
    if (saving || !quantityValid) return
    if (manualMode) {
      if (manualAbv != null && !validAlcoholStrength(manualAbv)) return
      if (!manualName.trim() || !Number.isFinite(qty) || qty <= 0 || manualError) return
      submitItem({
        food_name: manualName.trim(), quantity_g: qty,
        calories: manualCal, protein_g: manualProt,
        carbs_g: manualCarbs, fat_g: manualFat,
        fiber_g: manualFiber, sugars_g: manualSugars, salt_g: manualSalt,
        source: 'manual', off_food_id: null, category: manualCategory, food_key: null,
        pantry_item_id: null,
        unit: manualCategory === 'alcohol' || manualCategory === 'beverage' ? 'ml' : 'g',
        alcohol_abv: manualCategory === 'alcohol' ? manualAbv : null,
        piece_count: piece?.count ?? null, piece_size: piece?.size ?? null,
      })
      return
    }
    if (!selected || !Number.isFinite(qty) || qty <= 0
      || (selected.alcohol_abv != null && !validAlcoholStrength(selected.alcohol_abv))) return
    if (selectedAbv != null && !validAlcoholStrength(selectedAbv)) return
    const nutrition = selectedNutrition(selected, qty)
    submitItem({
      food_name: selected.name,
      ...nutrition,
      unit: selected.quantity_unit === 'ml' ? 'ml' : 'g',
      source: selected.source,
      off_food_id: selected.source === 'openfoodfacts' ? selected.id : null,
      category: selected.category,
      food_key: selected.food_key,
      pantry_item_id: selected.source === 'pantry' ? selected.id : null,
      piece_count: piece?.count ?? null, piece_size: piece?.size ?? null,
    })
  }

  return (
    <div className="space-y-4">
      {importMode ? (
        <div className="space-y-3">
          <button type="button" onClick={() => setImportMode(null)} className="text-sm text-gray-400">← Torna agli ingredienti</button>
          <Suspense fallback={<p className="text-sm text-gray-500">Caricamento…</p>}>
            <IngredientCatalog embedded initialMode={importMode} onCancel={() => setImportMode(null)} onSaved={item => {
              setPantryItems(current => [...current.filter(existing => existing.id !== item.id), item])
              selectFood(pantryItemToFoodResult(item))
              setQty(100)
              setImportMode(null)
            }} />
          </Suspense>
        </div>
      ) : (
      <>
      {!hideHeader && (
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Aggiungi alimento</h2>
          <button onClick={onClose} className="text-gray-400 text-xl" aria-label="Chiudi">✕</button>
        </div>
      )}

      {!manualMode ? (
        <>
          <div className="flex items-center gap-3 rounded-2xl border border-gray-700 bg-gray-800/80 px-4 py-3 focus-within:border-primary-500">
            <svg className="h-5 w-5 shrink-0 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="7" strokeWidth="2" />
              <path d="m20 20-4-4" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={e => { searchVersion.current += 1; setQuery(e.target.value); setSelected(null); setOffResults([]); setOffSearched(false); setOffError(false); setLoading(false) }}
              placeholder="Cerca un ingrediente..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-600"
            />
            {query && !selected && (
              <button type="button" onClick={() => setQuery('')} className="text-gray-600 hover:text-gray-300" aria-label="Cancella ricerca">✕</button>
            )}
          </div>

          {!selected && pantryResults.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              <p className="text-xs uppercase tracking-wide text-gray-500 px-1">I tuoi ingredienti</p>
              {pantryResults.map(f => (
                <button key={f.id} type="button" onClick={() => { selectFood(f) }}
                  className="w-full rounded-xl bg-gray-800 px-3 py-2.5 text-left text-sm hover:bg-gray-700">
                  <span className="font-medium">🧺 {f.name}</span>
                  <span className="text-gray-500 ml-2">{formatDecimal(f.calories_100g)} kcal/100{f.quantity_unit === 'ml' ? 'ml' : 'g'}</span>
                </button>
              ))}
            </div>
          )}

          {!selected && basicResults.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              <p className="text-xs uppercase tracking-wide text-gray-500 px-1">Alimenti base</p>
              {basicResults.map(f => (
                <button key={f.id} type="button" onClick={() => { selectFood(f) }}
                  className="w-full rounded-xl bg-gray-800 px-3 py-2.5 text-left text-sm hover:bg-gray-700">
                  <span className="font-medium">{f.name}</span>
                  <span className="text-gray-500 ml-2">{formatDecimal(f.calories_100g)} kcal/100{f.quantity_unit === 'ml' ? 'ml' : 'g'}</span>
                </button>
              ))}
            </div>
          )}

          {!selected && query.trim() && (
            <button
              type="button"
              onClick={handleOffSearch}
              disabled={loading}
              className="w-full rounded-xl border border-gray-700 py-2.5 text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50"
            >
              {loading ? 'Cerco...' : '🔍 Cerca prodotti confezionati (Open Food Facts)'}
            </button>
          )}

          {!selected && <IngredientEntryActions disabled={saving}
            onScan={() => setImportMode('scan')} onPhoto={() => setImportMode('photo')} onManual={startManual} />}

          {!selected && offError && (
            <p className="text-sm text-orange-400">Open Food Facts non disponibile.</p>
          )}

          {!selected && offSearched && !offError && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              <p className="text-xs uppercase tracking-wide text-gray-500 px-1">Prodotti confezionati</p>
              {offResults.length === 0 && (
                <p className="text-sm text-gray-500 px-1">Nessun risultato.</p>
              )}
              {offResults.map(p => (
                <button key={p.id} type="button" onClick={() => { selectFood(p) }}
                  className="w-full rounded-xl bg-gray-800 px-3 py-2.5 text-left text-sm hover:bg-gray-700">
                  <span className="font-medium">{p.name}</span>
                  {p.brand && <span className="text-gray-400 ml-2">· {p.brand}</span>}
                  <span className="text-gray-500 ml-2">{formatDecimal(p.calories_100g)} kcal/100{p.quantity_unit === 'ml' ? 'ml' : 'g'}</span>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="space-y-4 rounded-xl border border-gray-700 bg-gray-900 p-4 ring-1 ring-primary-500/20">
              <div className="flex justify-between">
                <span className="font-medium text-sm">{selected.name}</span>
                <button type="button" onClick={() => { setSelected(null); setPiece(null) }} className="text-gray-400 text-sm">Cambia</button>
              </div>
              {selected.source === 'openfoodfacts' && (
                <OpenFoodFactsDetails food={selected} detailedLabels />
              )}
              {selected.category === 'legume' && selected.source === 'basic' && (
                <p className="text-xs text-gray-400">
                  {selected.food_key?.includes('secch') || selected.food_key?.includes('secca')
                    ? 'Pesa il legume da secco: la cottura aumenterà il peso stimato del piatto.'
                    : selected.food_key?.includes('scatola')
                      ? 'Pesa solo il prodotto scolato: è già cotto e non verrà reidratato.'
                      : 'Inserisci il peso nello stato indicato dal nome dell’alimento.'}
                </p>
              )}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Quantità</label>
                <IngredientQuantityInput
                  key={`${selected.source}:${selected.id}`}
                  foodName={selected.name}
                  category={selected.category}
                  grams={qty}
                  unit={selected.quantity_unit === 'ml' ? 'ml' : 'g'}
                  onChange={setQty}
              onValidityChange={setQuantityValid}
                  pieceSize={piece?.size}
                  pieceCount={piece?.count}
                  onPieceChange={setPiece}
                />
              </div>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Categoria</span>
                <select
                  value={selected.category}
                  onChange={event => { setSelected({ ...selected, category: event.target.value as FoodCategory }); setPiece(null) }}
                  className="mt-1 w-full rounded-xl border border-gray-600 bg-gray-800/70 px-3 py-2.5 text-sm outline-none focus:border-primary-500"
                >
                  {FOOD_CATEGORIES.map(category => (
                    <option key={category.id} value={category.id}>{category.icon} {category.label}</option>
                  ))}
                </select>
              </label>
              {selected.category === 'alcohol' && <AlcoholStrengthInput value={selectedAbv === undefined ? alcoholStrength(selected) : selectedAbv}
                onChange={setSelectedAbv} volumeMl={selected.quantity_unit === 'ml' ? qty : undefined} disabled={saving} />}
              {(() => {
                const n = selectedNutrition(selected, qty)
                const extraNutrients = [
                  selected.fiber_100g == null ? null : `fibre ${formatDecimal(selected.fiber_100g)} g`,
                  selected.sugars_100g == null ? null : `di cui zuccheri ${formatDecimal(selected.sugars_100g)} g`,
                  selected.saturated_fat_100g == null ? null : `di cui grassi saturi ${formatDecimal(selected.saturated_fat_100g)} g`,
                  selected.unsaturated_fat_100g == null ? null : `di cui grassi insaturi ${formatDecimal(selected.unsaturated_fat_100g)} g`,
                  selected.salt_100g == null ? null : `sale ${formatDecimal(selected.salt_100g)} g`,
                ].filter(value => value !== null)
                return (
                  <>
                    <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                      <span className="rounded-lg bg-black/10 py-2 text-primary-400"><b>{formatDecimal(n.calories)}</b><small className="block text-[9px] text-gray-500">kcal</small></span>
                      <span className="rounded-lg bg-black/10 py-2"><b>{formatDecimal(n.protein_g)}g</b><small className="block text-[9px] text-gray-500">proteine</small></span>
                      <span className="rounded-lg bg-black/10 py-2"><b>{formatDecimal(n.carbs_g)}g</b><small className="block text-[9px] text-gray-500">carbo tot.</small></span>
                      <span className="rounded-lg bg-black/10 py-2"><b>{formatDecimal(n.fat_g)}g</b><small className="block text-[9px] text-gray-500">grassi tot.</small></span>
                    </div>
                    {selected.source !== 'openfoodfacts' && extraNutrients.length > 0 && (
                      <p className="text-[11px] text-gray-500">
                        Per 100 {selected.quantity_unit === 'ml' ? 'ml' : 'g'}: {extraNutrients.join(' · ')}
                      </p>
                    )}
                    {(selected.nutrition_grade || (selected.nutrition_score !== null && selected.nutrition_score !== undefined) || selected.nova_group || selected.ecoscore_grade) && (
                      <p className="text-[11px] text-gray-500">
                        {selected.nutrition_grade && `Nutri-Score ${selected.nutrition_grade.toUpperCase()}`}
                        {selected.nutrition_score !== null && selected.nutrition_score !== undefined && ` · punteggio ${selected.nutrition_score}`}
                        {selected.nova_group && ` · NOVA ${selected.nova_group}`}
                        {selected.ecoscore_grade && ` · Eco-Score ${selected.ecoscore_grade.toUpperCase()}`}
                      </p>
                    )}
                    {(selected.ingredients || selected.allergens) && (
                      <details className="text-xs text-gray-500">
                        <summary className="cursor-pointer text-gray-400">Dettagli prodotto</summary>
                        {selected.ingredients && <p className="mt-1"><span className="text-gray-400">Ingredienti:</span> {selected.ingredients}</p>}
                        {selected.allergens && <p className="mt-1"><span className="text-gray-400">Allergeni:</span> {selected.allergens}</p>}
                      </details>
                    )}
                  </>
                )
              })()}
              <button type="button" onClick={handleAdd} disabled={!quantityValid || !Number.isFinite(qty) || qty <= 0 || saving || (selectedAbv != null && !validAlcoholStrength(selectedAbv))}
                className="w-full rounded-xl bg-primary-500 py-3 font-semibold hover:bg-primary-400 disabled:opacity-40">
                {saving ? 'Registrazione…' : addLabel}
              </button>
            </div>
          )}

        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Voce personalizzata</p>
              <p className="text-sm text-gray-500">Inserisci i valori della porzione</p>
            </div>
            <button type="button" onClick={() => { setManualMode(false); setPiece(null) }} className="text-sm text-gray-400 hover:text-white">← Ricerca</button>
          </div>
          <div className="rounded-xl border border-gray-700 bg-gray-800/80 px-3 py-2.5 focus-within:border-primary-500">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Nome alimento</label>
            <input value={manualName} onChange={e => { setManualName(e.target.value); setPiece(null) }}
              placeholder="Es. Tiramisù della casa"
              className="mt-1 w-full bg-transparent font-medium outline-none placeholder:text-gray-600" />
          </div>
          <label className="block rounded-xl border border-gray-700 bg-gray-800/80 px-3 py-2.5 focus-within:border-primary-500">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500">Categoria</span>
            <select value={manualCategory} onChange={event => { setManualCategory(event.target.value as FoodCategory); setPiece(null) }}
              className="mt-1 w-full bg-transparent text-sm font-medium outline-none">
              {FOOD_CATEGORIES.map(category => (
                <option key={category.id} value={category.id} className="bg-gray-800">{category.icon} {category.label}</option>
              ))}
            </select>
          </label>
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500">Quantità</span>
            <IngredientQuantityInput
              foodName={manualName} unit={manualCategory === 'alcohol' || manualCategory === 'beverage' ? 'ml' : 'g'}
              category={manualCategory}
              grams={qty}
              onChange={setQty}
              onValidityChange={setQuantityValid}
              pieceSize={piece?.size}
              pieceCount={piece?.count}
              onPieceChange={setPiece}
            />
          </div>
          {manualCategory === 'alcohol' && <AlcoholStrengthInput value={manualAbv} onChange={setManualAbv} volumeMl={qty} />}
          <NutritionFields values={manualValues} disabled={saving} onChange={(key, value) => {
            switch (key) {
              case 'calories': setManualCal(value ?? 0); break
              case 'protein_g': setManualProt(value ?? 0); break
              case 'carbs_g': setManualCarbs(value ?? 0); break
              case 'fat_g': setManualFat(value ?? 0); break
              case 'fiber_g': setManualFiber(value); break
              case 'sugars_g': setManualSugars(value); break
              case 'salt_g': setManualSalt(value); break
            }
          }} />
          {manualError && <p role="alert" className="text-xs text-amber-300">{manualError}</p>}
          <button type="button" onClick={handleAdd}
            disabled={saving || !quantityValid || !manualName.trim() || !Number.isFinite(qty) || qty <= 0 || Boolean(manualError)
              || (manualAbv != null && !validAlcoholStrength(manualAbv))}
            className="w-full rounded-xl bg-primary-500 py-3 font-semibold hover:bg-primary-400 disabled:opacity-40">
            {saving ? 'Registrazione…' : addLabel}
          </button>
        </div>
      )}
      </>
      )}
    </div>
  )
}
