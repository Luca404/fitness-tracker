import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import * as api from '../services/api'
import { searchBasicFoods, lookupBarcode } from '../services/nutrition'
import BarcodeScanner from '../components/pantry/BarcodeScanner'
import type { PantryItem, PantryUnit, FoodSource } from '../types'

interface PendingFood {
  name: string
  calories_100g: number
  protein_100g: number
  carbs_100g: number
  fat_100g: number
  category: string | null
  source: FoodSource
  off_food_id: string | null
}

type Mode = 'list' | 'choose' | 'scan' | 'search' | 'manual' | 'quantity'

const UNIT_LABELS: Record<PantryUnit, string> = { g: 'grammi', ml: 'millilitri', pz: 'pezzi' }

export default function PantryPage() {
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

  async function refresh() {
    setLoading(true)
    try {
      setItems(await api.getPantryItems())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  function resetAddFlow() {
    setMode('list')
    setPending(null)
    setQuery('')
    setScanError(null)
    setManualName(''); setManualCal(0); setManualProt(0); setManualCarbs(0); setManualFat(0)
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
        category: null,
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
    goToQuantity({
      name: manualName.trim(),
      calories_100g: manualCal,
      protein_100g: manualProt,
      carbs_100g: manualCarbs,
      fat_100g: manualFat,
      category: null,
      source: 'manual',
      off_food_id: null,
    }, 'g')
  }

  async function handleAddToPantry() {
    if (!pending || !user) return
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
      source: pending.source,
      off_food_id: pending.off_food_id,
    })
    showToast('Aggiunto alla dispensa')
    resetAddFlow()
    await refresh()
  }

  async function handleDelete(id: string) {
    await api.deletePantryItem(id)
    await refresh()
  }

  const basicResults = query.trim() ? searchBasicFoods(query) : []

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-lg font-semibold">Dispensa</h1>

      {mode === 'list' && (
        <>
          <button type="button" onClick={() => setMode('choose')}
            className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-500 font-medium">
            + Aggiungi articolo
          </button>

          {loading ? (
            <div className="h-32 bg-gray-800 rounded-xl animate-pulse" />
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Dispensa vuota. Scansiona un prodotto o aggiungilo a mano.</p>
          ) : (
            <div className="card divide-y divide-gray-800">
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.quantity} {UNIT_LABELS[item.unit]} · {Math.round(item.calories_100g)} kcal/100{item.unit === 'ml' ? 'ml' : 'g'}
                    </p>
                  </div>
                  <button type="button" onClick={() => handleDelete(item.id)}
                    className="text-gray-600 hover:text-red-400 text-lg ml-2" aria-label="Rimuovi">✕</button>
                </div>
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
                  carbs_100g: f.carbs_100g, fat_100g: f.fat_100g, category: null, source: 'basic', off_food_id: null,
                }, 'g')}
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
          {[
            { label: 'Calorie (kcal/100g)', val: manualCal, set: setManualCal },
            { label: 'Proteine (g/100g)', val: manualProt, set: setManualProt },
            { label: 'Carboidrati (g/100g)', val: manualCarbs, set: setManualCarbs },
            { label: 'Grassi (g/100g)', val: manualFat, set: setManualFat },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label className="text-sm text-gray-400">{label}</label>
              <input type="number" value={val || ''}
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
          <p className="font-medium text-sm">{pending.name}</p>
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
