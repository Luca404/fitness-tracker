import { useEffect, useMemo, useState } from 'react'
import { searchBasicFoods, searchFood, calcNutrition } from '../../services/nutrition'
import * as api from '../../services/api'
import { useData } from '../../contexts/DataContext'
import { FOOD_CATEGORIES } from '../../data/foodCategories'
import type { FoodResult, FoodSource, PantryItem, FoodCategory } from '../../types'
import OpenFoodFactsDetails from '../common/OpenFoodFactsDetails'
import IngredientQuantityInput from './IngredientQuantityInput'

function pantryItemToFoodResult(p: PantryItem): FoodResult {
  return {
    id: p.id,
    name: p.name,
    brand: null,
    source: 'pantry',
    category: p.category,
    food_key: p.food_key,
    calories_100g: p.calories_100g,
    protein_100g: p.protein_100g,
    carbs_100g: p.carbs_100g,
    fat_100g: p.fat_100g,
  }
}

interface Props {
  onAdd: (item: {
    food_name: string; quantity_g: number; calories: number
    protein_g: number; carbs_g: number; fat_g: number
    source: FoodSource; off_food_id: string | null
    category: FoodResult['category']; food_key: string | null; pantry_item_id: string | null
  }) => void
  onClose: () => void
  hideHeader?: boolean
}

export default function FoodSearch({ onAdd, onClose, hideHeader }: Props) {
  const { showToast } = useData()
  const [query, setQuery] = useState('')
  const [offResults, setOffResults] = useState<FoodResult[]>([])
  const [offSearched, setOffSearched] = useState(false)
  const [selected, setSelected] = useState<FoodResult | null>(null)
  const [qty, setQty] = useState(100)
  const [loading, setLoading] = useState(false)
  const [offError, setOffError] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualCal, setManualCal] = useState(0)
  const [manualProt, setManualProt] = useState(0)
  const [manualCarbs, setManualCarbs] = useState(0)
  const [manualFat, setManualFat] = useState(0)
  const [manualCategory, setManualCategory] = useState<FoodCategory>('other')
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([])

  useEffect(() => {
    api.getPantryItems().then(setPantryItems).catch(() => {
      showToast('Dispensa non disponibile')
    })
  }, [showToast])

  const basicResults = useMemo(() => searchBasicFoods(query), [query])

  const pantryResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return pantryItems.filter(p => p.quantity > 0 && p.name.toLowerCase().includes(q)).map(pantryItemToFoodResult)
  }, [query, pantryItems])

  async function handleOffSearch() {
    if (!query.trim()) return
    setLoading(true)
    setOffError(false)
    try {
      const r = await searchFood(query)
      setOffResults(r)
      setOffSearched(true)
    } catch {
      setOffError(true)
    } finally {
      setLoading(false)
    }
  }

  function handleAdd() {
    if (manualMode) {
      if (!manualName.trim() || qty <= 0 || [manualCal, manualProt, manualCarbs, manualFat].some(v => v < 0)) return
      onAdd({
        food_name: manualName.trim(), quantity_g: qty,
        calories: manualCal, protein_g: manualProt,
        carbs_g: manualCarbs, fat_g: manualFat,
        source: 'manual', off_food_id: null, category: manualCategory, food_key: null,
        pantry_item_id: null,
      })
      return
    }
    if (!selected) return
    const nutrition = calcNutrition(selected, qty)
    onAdd({
      food_name: selected.name,
      quantity_g: qty,
      ...nutrition,
      source: selected.source,
      off_food_id: selected.source === 'openfoodfacts' ? selected.id : null,
      category: selected.category,
      food_key: selected.food_key,
      pantry_item_id: selected.source === 'pantry' ? selected.id : null,
    })
  }

  return (
    <div className="space-y-4">
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
              onChange={e => { setQuery(e.target.value); setOffResults([]); setOffSearched(false) }}
              placeholder="Cerca un ingrediente..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-600"
            />
            {query && !selected && (
              <button type="button" onClick={() => setQuery('')} className="text-gray-600 hover:text-gray-300" aria-label="Cancella ricerca">✕</button>
            )}
          </div>

          {!selected && pantryResults.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              <p className="text-xs uppercase tracking-wide text-gray-500 px-1">La tua dispensa</p>
              {pantryResults.map(f => (
                <button key={f.id} type="button" onClick={() => setSelected(f)}
                  className="w-full rounded-xl bg-gray-800 px-3 py-2.5 text-left text-sm hover:bg-gray-700">
                  <span className="font-medium">🧺 {f.name}</span>
                  <span className="text-gray-500 ml-2">{Math.round(f.calories_100g)} kcal/100g</span>
                </button>
              ))}
            </div>
          )}

          {!selected && basicResults.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              <p className="text-xs uppercase tracking-wide text-gray-500 px-1">Alimenti base</p>
              {basicResults.map(f => (
                <button key={f.id} type="button" onClick={() => setSelected(f)}
                  className="w-full rounded-xl bg-gray-800 px-3 py-2.5 text-left text-sm hover:bg-gray-700">
                  <span className="font-medium">{f.name}</span>
                  <span className="text-gray-500 ml-2">{Math.round(f.calories_100g)} kcal/100g</span>
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
                <button key={p.id} type="button" onClick={() => setSelected(p)}
                  className="w-full rounded-xl bg-gray-800 px-3 py-2.5 text-left text-sm hover:bg-gray-700">
                  <span className="font-medium">{p.name}</span>
                  {p.brand && <span className="text-gray-400 ml-2">· {p.brand}</span>}
                  <span className="text-gray-500 ml-2">{Math.round(p.calories_100g)} kcal/100g</span>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="space-y-4 rounded-2xl bg-gradient-to-br from-primary-600/15 to-gray-800 p-4 ring-1 ring-primary-500/20">
              <div className="flex justify-between">
                <span className="font-medium text-sm">{selected.name}</span>
                <button type="button" onClick={() => setSelected(null)} className="text-gray-400 text-sm">Cambia</button>
              </div>
              {selected.source === 'openfoodfacts' && (
                <OpenFoodFactsDetails food={selected} />
              )}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Quantità</label>
                <IngredientQuantityInput
                  key={`${selected.source}:${selected.id}`}
                  foodName={selected.name}
                  category={selected.category}
                  grams={qty}
                  onChange={setQty}
                />
              </div>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Categoria</span>
                <select
                  value={selected.category}
                  onChange={event => setSelected({ ...selected, category: event.target.value as FoodCategory })}
                  className="mt-1 w-full rounded-xl border border-gray-600 bg-gray-800/70 px-3 py-2.5 text-sm outline-none focus:border-primary-500"
                >
                  {FOOD_CATEGORIES.map(category => (
                    <option key={category.id} value={category.id}>{category.icon} {category.label}</option>
                  ))}
                </select>
              </label>
              {(() => {
                const n = calcNutrition(selected, qty)
                return (
                  <>
                    <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                      <span className="rounded-lg bg-black/10 py-2 text-primary-400"><b>{n.calories}</b><small className="block text-[9px] text-gray-500">kcal</small></span>
                      <span className="rounded-lg bg-black/10 py-2"><b>{n.protein_g}g</b><small className="block text-[9px] text-gray-500">proteine</small></span>
                      <span className="rounded-lg bg-black/10 py-2"><b>{n.carbs_g}g</b><small className="block text-[9px] text-gray-500">carbo</small></span>
                      <span className="rounded-lg bg-black/10 py-2"><b>{n.fat_g}g</b><small className="block text-[9px] text-gray-500">grassi</small></span>
                    </div>
                    {(selected.fiber_100g || selected.sugars_100g || selected.salt_100g || selected.saturated_fat_100g || selected.unsaturated_fat_100g) ? (
                      <p className="text-[11px] text-gray-500">
                        Per 100 g: fibre {selected.fiber_100g ?? 0} g · zuccheri {selected.sugars_100g ?? 0} g · saturi {selected.saturated_fat_100g ?? 0} g · insaturi {selected.unsaturated_fat_100g ?? 0} g · sale {selected.salt_100g ?? 0} g
                      </p>
                    ) : null}
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
              <button type="button" onClick={handleAdd} disabled={qty <= 0}
                className="w-full rounded-xl bg-primary-500 py-3 font-semibold hover:bg-primary-400 disabled:opacity-40">
                + Aggiungi ingrediente
              </button>
            </div>
          )}

          <button type="button" onClick={() => setManualMode(true)}
            className="w-full rounded-xl border border-dashed border-gray-700 py-2.5 text-center text-sm text-gray-500 hover:border-gray-600 hover:text-gray-300">
            Non lo trovi? Inseriscilo manualmente
          </button>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Voce personalizzata</p>
              <p className="text-sm text-gray-500">Inserisci i valori della porzione</p>
            </div>
            <button type="button" onClick={() => setManualMode(false)} className="text-sm text-gray-400 hover:text-white">← Ricerca</button>
          </div>
          <div className="rounded-xl border border-gray-700 bg-gray-800/80 px-3 py-2.5 focus-within:border-primary-500">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Nome alimento</label>
            <input value={manualName} onChange={e => setManualName(e.target.value)}
              placeholder="Es. Tiramisù della casa"
              className="mt-1 w-full bg-transparent font-medium outline-none placeholder:text-gray-600" />
          </div>
          <label className="block rounded-xl border border-gray-700 bg-gray-800/80 px-3 py-2.5 focus-within:border-primary-500">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500">Categoria</span>
            <select value={manualCategory} onChange={event => setManualCategory(event.target.value as FoodCategory)}
              className="mt-1 w-full bg-transparent text-sm font-medium outline-none">
              {FOOD_CATEGORIES.map(category => (
                <option key={category.id} value={category.id} className="bg-gray-800">{category.icon} {category.label}</option>
              ))}
            </select>
          </label>
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500">Quantità</span>
            <IngredientQuantityInput
              foodName={manualName}
              category={manualCategory}
              grams={qty}
              onChange={setQty}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Calorie', unit: 'kcal', val: manualCal, set: (v: number) => setManualCal(v), min: 0 },
              { label: 'Proteine', unit: 'g', val: manualProt, set: (v: number) => setManualProt(v), min: 0 },
              { label: 'Carboidrati', unit: 'g', val: manualCarbs, set: (v: number) => setManualCarbs(v), min: 0 },
              { label: 'Grassi', unit: 'g', val: manualFat, set: (v: number) => setManualFat(v), min: 0 },
            ].map(({ label, unit, val, set, min }) => (
              <label key={label} className="rounded-xl border border-gray-700 bg-gray-800/80 p-3 focus-within:border-primary-500">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</span>
                <span className="mt-1 flex items-center gap-2">
                  <input type="number" min={min} value={val || ''}
                    onChange={e => set(parseFloat(e.target.value) || 0)}
                    className="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none" />
                  <span className="text-xs text-gray-600">{unit}</span>
                </span>
              </label>
            ))}
          </div>
          <button type="button" onClick={handleAdd}
            disabled={!manualName.trim() || qty <= 0 || [manualCal, manualProt, manualCarbs, manualFat].some(v => v < 0)}
            className="w-full rounded-xl bg-primary-500 py-3 font-semibold hover:bg-primary-400 disabled:opacity-40">
            + Aggiungi ingrediente
          </button>
        </div>
      )}
    </div>
  )
}
