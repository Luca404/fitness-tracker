import { useState } from 'react'
import { searchFood, calcNutrition } from '../../services/nutrition'
import type { OFFProduct, MealType } from '../../types'

interface Props {
  mealType: MealType
  onAdd: (item: {
    food_name: string; quantity_g: number; calories: number
    protein_g: number; carbs_g: number; fat_g: number
    source: 'openfoodfacts' | 'manual'; off_food_id: string | null
  }) => void
  onClose: () => void
  hideHeader?: boolean
}

export default function FoodSearch({ mealType: _mealType, onAdd, onClose, hideHeader }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OFFProduct[]>([])
  const [selected, setSelected] = useState<OFFProduct | null>(null)
  const [qty, setQty] = useState(100)
  const [loading, setLoading] = useState(false)
  const [offlineMode, setOfflineMode] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualCal, setManualCal] = useState(0)
  const [manualProt, setManualProt] = useState(0)
  const [manualCarbs, setManualCarbs] = useState(0)
  const [manualFat, setManualFat] = useState(0)

  async function handleSearch() {
    if (!query.trim()) return
    setLoading(true)
    try {
      const r = await searchFood(query)
      setResults(r)
    } catch {
      setOfflineMode(true)
    } finally {
      setLoading(false)
    }
  }

  function handleAdd() {
    if (offlineMode) {
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
      food_name: selected.product_name,
      quantity_g: qty,
      ...nutrition,
      source: 'openfoodfacts',
      off_food_id: selected.code,
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

      {!offlineMode ? (
        <>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Cerca alimento..."
              className="flex-1 px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 outline-none focus:border-primary-500"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="px-4 py-2 bg-primary-600 rounded-lg disabled:opacity-50"
            >
              {loading ? '...' : '🔍'}
            </button>
          </div>

          {results.length > 0 && !selected && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {results.map(p => (
                <button key={p.code} type="button" onClick={() => setSelected(p)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm">
                  <span className="font-medium">{p.product_name}</span>
                  {p.brands && <span className="text-gray-400 ml-2">· {p.brands}</span>}
                  <span className="text-gray-500 ml-2">
                    {Math.round(p.nutriments['energy-kcal_100g'])} kcal/100g
                  </span>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="bg-gray-700 rounded-lg p-3 space-y-3">
              <div className="flex justify-between">
                <span className="font-medium text-sm">{selected.product_name}</span>
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

          <button type="button" onClick={() => setOfflineMode(true)}
            className="text-sm text-gray-500 text-center w-full">
            Inserimento manuale
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-orange-400">Open Food Facts non disponibile. Inserimento manuale.</p>
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
        </div>
      )}
    </div>
  )
}
