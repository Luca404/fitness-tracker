import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import * as api from '../services/api'
import { searchBasicFoods, lookupBarcode } from '../services/nutrition'
import BarcodeScanner from '../components/pantry/BarcodeScanner'
import { FOOD_CATEGORIES, FOOD_CATEGORY_BY_ID } from '../data/foodCategories'
import type { PantryItem, PantryUnit, FoodSource, FoodCategory } from '../types'

interface PendingFood {
  name: string
  calories_100g: number
  protein_100g: number
  carbs_100g: number
  fat_100g: number
  category: FoodCategory
  food_key: string | null
  source: FoodSource
  off_food_id: string | null
}

type Mode = 'list' | 'choose' | 'scan' | 'search' | 'manual' | 'quantity'

const UNIT_LABELS: Record<PantryUnit, string> = { g: 'grammi', ml: 'millilitri', pz: 'pezzi' }

export default function PantryPage({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth()
  const { showToast } = useData()
  const [items, setItems] = useState<PantryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('list')
  const [pending, setPending] = useState<PendingFood | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState<PantryUnit>('pz')
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanLoading, setScanLoading] = useState(false)

  const [query, setQuery] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualCal, setManualCal] = useState(0)
  const [manualProt, setManualProt] = useState(0)
  const [manualCarbs, setManualCarbs] = useState(0)
  const [manualFat, setManualFat] = useState(0)
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

  useEffect(() => {
    // Initial remote-data synchronization; refresh also owns the loading state for later reloads.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  function resetAddFlow() {
    setMode('list')
    setPending(null)
    setQuery('')
    setScanError(null)
    setManualName(''); setManualCal(0); setManualProt(0); setManualCarbs(0); setManualFat(0); setManualCategory('other')
  }

  function goToQuantity(food: PendingFood, defaultUnit: PantryUnit) {
    setPending(food)
    setUnit(defaultUnit)
    setQuantity(defaultUnit === 'pz' ? 1 : 100)
    setMode('quantity')
  }

  async function handleScan(code: string) {
    setScanLoading(true)
    setScanError(null)
    try {
      const result = await lookupBarcode(code)
      if (!result) {
        setScanError('Prodotto non trovato su Open Food Facts. Prova con la ricerca manuale.')
        return
      }
      goToQuantity({
        name: result.name,
        calories_100g: result.calories_100g,
        protein_100g: result.protein_100g,
        carbs_100g: result.carbs_100g,
        fat_100g: result.fat_100g,
        category: result.category,
        food_key: result.food_key,
        source: 'barcode',
        off_food_id: result.id,
      }, 'g')
    } catch {
      setScanError('Errore nel recupero dati prodotto.')
    } finally {
      setScanLoading(false)
    }
  }

  function handleManualConfirm() {
    if (!manualName.trim()) return
    if ([manualCal, manualProt, manualCarbs, manualFat].some(v => v < 0)) {
      showToast('I valori nutrizionali non possono essere negativi')
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
    }, 'g')
  }

  async function handleAddToPantry() {
    if (!pending || !user) return
    try {
      await api.addPantryItem({
        user_id: user.id,
        name: pending.name,
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
      })
      showToast('Aggiunto alla dispensa')
      resetAddFlow()
      await refresh()
    } catch {
      showToast('Errore aggiunta articolo')
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
                      <div key={item.id} className="flex items-center justify-between px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            {item.quantity} {UNIT_LABELS[item.unit]} · {Math.round(item.calories_100g)} kcal/100{item.unit === 'ml' ? 'ml' : 'g'}
                          </p>
                        </div>
                        <button type="button" onClick={() => handleDelete(item.id)}
                          className="ml-2 text-lg text-gray-600 hover:text-red-400" aria-label={`Rimuovi ${item.name}`}>✕</button>
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
            <button type="button" onClick={() => setMode('scan')}
              className="py-4 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-medium">
              📷 Scansiona codice a barre
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
              <button type="button" onClick={() => setMode('search')}
                className="w-full py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm">
                Cerca manualmente
              </button>
            </div>
          )}
        </div>
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
            <label className="text-sm text-gray-400">Nome alimento</label>
            <input value={manualName} onChange={e => setManualName(e.target.value)}
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
            { label: 'Carboidrati (g/100g)', val: manualCarbs, set: setManualCarbs },
            { label: 'Grassi (g/100g)', val: manualFat, set: setManualFat },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label className="text-sm text-gray-400">{label}</label>
              <input type="number" min={0} value={val || ''}
                onChange={e => set(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded bg-gray-700 border border-gray-600 outline-none" />
            </div>
          ))}
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
            <p className="text-xs text-gray-500">{FOOD_CATEGORY_BY_ID[pending.category].icon} {FOOD_CATEGORY_BY_ID[pending.category].label}</p>
            <p className="mt-1 font-semibold">{pending.name}</p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Quantità</label>
            <input type="number" min={0} value={quantity}
              onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full mt-1 px-3 py-2 rounded bg-gray-700 border border-gray-600 outline-none" />
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
          <button type="button" onClick={handleAddToPantry} disabled={quantity <= 0}
            className="w-full py-3 bg-primary-600 rounded-lg font-semibold disabled:opacity-40">
            Aggiungi alla dispensa
          </button>
          <button type="button" onClick={resetAddFlow} className="text-sm text-gray-500 text-center w-full">
            Annulla
          </button>
        </div>
      )}
    </div>
  )
}
