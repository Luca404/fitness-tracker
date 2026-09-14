import { useEffect, useMemo, useState } from 'react'
import { searchBasicFoods, searchFood, calcNutrition } from '../../services/nutrition'
import * as api from '../../services/api'
import type { FoodResult, FoodSource, PantryItem } from '../../types'

function pantryItemToFoodResult(p: PantryItem): FoodResult {
  return {
    id: p.id,
    name: p.name,
    brand: null,
    source: 'pantry',
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
  }) => void
  onClose: () => void
  hideHeader?: boolean
}

export default function FoodSearch({ onAdd, onClose, hideHeader }: Props) {
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
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([])

  useEffect(() => {
    api.getPantryItems().then(setPantryItems).catch(() => {})
  }, [])

  const basicResults = useMemo(() => searchBasicFoods(query), [query])

  const pantryResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return pantryItems.filter(p => p.name.toLowerCase().includes(q)).map(pantryItemToFoodResult)
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
      onAdd({
        food_name: manualName, quantity_g: qty,
        calories: manualCal, protein_g: manualProt,
        carbs_g: manualCarbs, fat_g: manualFat,
        source: 'manual', off_food_id: null,
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
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setOffResults([]); setOffSearched(false) }}
            placeholder="Cerca alimento..."
            className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 outline-none focus:border-primary-500"
          />

          {!selected && pantryResults.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              <p className="text-xs uppercase tracking-wide text-gray-500 px-1">La tua dispensa</p>
              {pantryResults.map(f => (
                <button key={f.id} type="button" onClick={() => setSelected(f)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm">
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
                  className="w-full text-left px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm">
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
              className="w-full py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm disabled:opacity-50"
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
                  className="w-full text-left px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm">
                  <span className="font-medium">{p.name}</span>
                  {p.brand && <span className="text-gray-400 ml-2">· {p.brand}</span>}
                  <span className="text-gray-500 ml-2">{Math.round(p.calories_100g)} kcal/100g</span>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="bg-gray-700 rounded-lg p-3 space-y-3">
              <div className="flex justify-between">
                <span className="font-medium text-sm">{selected.name}</span>
                <button type="button" onClick={() => setSelected(null)} className="text-gray-400 text-sm">Cambia</button>
              </div>
              <div>
                <label className="text-sm text-gray-400">Quantità (g)</label>
                <input type="number" min={1} value={qty}
                  onChange={e => setQty(parseInt(e.target.value) || 100)}
                  className="w-full mt-1 px-3 py-2 rounded bg-gray-600 border border-gray-500 outline-none" />
              </div>
              {(() => {
                const n = calcNutrition(selected, qty)
                return (
                  <p className="text-sm text-primary-400">
                    {n.calories} kcal · P {n.protein_g}g · C {n.carbs_g}g · G {n.fat_g}g
                  </p>
                )
              })()}
              <button type="button" onClick={handleAdd}
                className="w-full py-3 bg-primary-600 rounded-lg font-semibold">
                Aggiungi
              </button>
            </div>
          )}

          <button type="button" onClick={() => setManualMode(true)}
            className="text-sm text-gray-500 text-center w-full">
            Inserimento manuale
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-400">Nome alimento</label>
            <input value={manualName} onChange={e => setManualName(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded bg-gray-700 border border-gray-600 outline-none" />
          </div>
          {[
            { label: 'Quantità (g)', val: qty, set: (v: number) => setQty(v) },
            { label: 'Calorie (kcal)', val: manualCal, set: (v: number) => setManualCal(v) },
            { label: 'Proteine (g)', val: manualProt, set: (v: number) => setManualProt(v) },
            { label: 'Carboidrati (g)', val: manualCarbs, set: (v: number) => setManualCarbs(v) },
            { label: 'Grassi (g)', val: manualFat, set: (v: number) => setManualFat(v) },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label className="text-sm text-gray-400">{label}</label>
              <input type="number" value={val || ''}
                onChange={e => set(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded bg-gray-700 border border-gray-600 outline-none" />
            </div>
          ))}
          <button type="button" onClick={handleAdd} disabled={!manualName}
            className="w-full py-3 bg-primary-600 rounded-lg font-semibold disabled:opacity-40">
            Aggiungi
          </button>
          <button type="button" onClick={() => setManualMode(false)}
            className="text-sm text-gray-500 text-center w-full">
            Torna alla ricerca
          </button>
        </div>
      )}
    </div>
  )
}
