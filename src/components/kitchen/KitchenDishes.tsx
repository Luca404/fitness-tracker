import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import * as api from '../../services/api'
import Modal from '../common/Modal'
import DishEditor, { type DishItemDraft } from '../meals/DishEditor'
import { getDishAvailability } from '../../utils/ingredientMatching'
import { getFoodIcon } from '../../utils/foodIcons'
import { getExtendedNutritionTotals } from '../../utils/extendedNutrition'
import type { Dish, PantryItem } from '../../types'
import ExtendedNutrition from '../meals/ExtendedNutrition'

function dishTotals(dish: Dish) {
  return dish.items.reduce((total, item) => ({
    weight: total.weight + item.quantity_g,
    calories: total.calories + item.calories,
    protein: total.protein + item.protein_g,
    carbs: total.carbs + item.carbs_g,
    fat: total.fat + item.fat_g,
  }), { weight: 0, calories: 0, protein: 0, carbs: 0, fat: 0 })
}

function toDraft(item: Dish['items'][number]): DishItemDraft {
  return {
    food_name: item.food_name,
    quantity_g: item.quantity_g,
    calories: item.calories,
    protein_g: item.protein_g,
    carbs_g: item.carbs_g,
    fat_g: item.fat_g,
    fiber_g: item.fiber_g ?? null,
    sugars_g: item.sugars_g ?? null,
    salt_g: item.salt_g ?? null,
    source: item.source,
    off_food_id: item.off_food_id,
    category: item.category,
    food_key: item.food_key,
    pantry_item_id: item.pantry_item_id ?? null,
  }
}

type EditorMode = 'closed' | 'create' | 'detail' | 'edit'

export default function KitchenDishes() {
  const { user } = useAuth()
  const { showToast } = useData()
  const [dishes, setDishes] = useState<Dish[]>([])
  const [pantry, setPantry] = useState<PantryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<EditorMode>('closed')
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [nextDishes, nextPantry] = await Promise.all([api.getDishes(), api.getPantryItems()])
      setDishes(nextDishes)
      setPantry(nextPantry)
    } catch {
      showToast('Errore caricamento Cucina')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { refresh() }, [refresh])

  const visibleDishes = dishes.filter(dish => dish.name.toLowerCase().includes(query.trim().toLowerCase()))

  function openDetail(dish: Dish) {
    setSelectedDish(dish)
    setMode('detail')
  }

  async function createDish(name: string, items: DishItemDraft[]) {
    if (!user) return
    try {
      await api.createDish(user.id, name, items)
      await refresh()
      setMode('closed')
      showToast('Piatto salvato')
    } catch {
      showToast('Errore creazione piatto')
      throw new Error('create failed')
    }
  }

  async function updateDish(name: string, items: DishItemDraft[]) {
    if (!selectedDish) return
    try {
      await api.updateDish(selectedDish.id, name, items)
      await refresh()
      setSelectedDish(null)
      setMode('closed')
      showToast('Piatto aggiornato')
    } catch {
      showToast('Errore modifica piatto')
      throw new Error('update failed')
    }
  }

  async function deleteDish() {
    if (!selectedDish || !window.confirm(`Eliminare “${selectedDish.name}” dai piatti salvati?`)) return
    try {
      await api.deleteDish(selectedDish.id)
      await refresh()
      setSelectedDish(null)
      setMode('closed')
      showToast('Piatto eliminato')
    } catch {
      showToast('Errore eliminazione piatto')
    }
  }

  async function saveSuggestedDish() {
    if (!selectedDish || !user) return
    try {
      await api.createDish(user.id, selectedDish.name, selectedDish.items.map(toDraft))
      await refresh()
      setSelectedDish(null)
      setMode('closed')
      showToast('Idea salvata nei tuoi piatti')
    } catch {
      showToast('Errore salvataggio piatto')
    }
  }

  return (
    <div className="space-y-6">
      <button type="button" onClick={() => { setSelectedDish(null); setMode('create') }}
        className="flex w-full items-center gap-3 rounded-2xl bg-primary-500 px-4 py-3.5 text-left font-semibold shadow-lg shadow-primary-950/30 hover:bg-primary-400">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-xl">+</span>
        <span><span className="block">Crea un nuovo piatto</span><span className="block text-xs font-normal text-primary-100">Componi la ricetta ingrediente per ingrediente</span></span>
      </button>

      <section>
        <div className="mb-3 flex items-end justify-between px-1">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Ricettario</p><h2 className="mt-1 text-lg font-bold">I tuoi piatti</h2></div>
          <span className="rounded-full bg-gray-800 px-2.5 py-1 text-xs text-gray-500">{dishes.length}</span>
        </div>
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cerca un piatto..."
          className="mb-3 w-full rounded-2xl border border-gray-700 bg-gray-800/70 px-4 py-3 text-sm outline-none focus:border-primary-500" />
        {loading ? (
          <div className="h-32 animate-pulse rounded-2xl bg-gray-800" />
        ) : visibleDishes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-700 py-8 text-center">
            <span className="text-3xl">📖</span>
            <p className="mt-2 text-sm text-gray-500">{dishes.length === 0 ? 'Nessun piatto salvato' : 'Nessun risultato'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleDishes.map(dish => {
              const totals = dishTotals(dish)
              return (
                <button key={dish.id} type="button" onClick={() => openDetail(dish)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-gray-800 bg-gray-800/55 p-3 text-left hover:border-gray-700">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-700/60 text-xl">{getFoodIcon(dish.items)}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{dish.name}</span><span className="text-xs text-gray-500">{dish.items.length} ingredienti · {Math.round(totals.weight)} g</span></span>
                  <span className="text-sm font-semibold text-primary-400">{Math.round(totals.calories)}<small className="ml-1 text-[9px]">kcal</small></span>
                  <span className="text-gray-600">›</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <Modal
        open={mode !== 'closed'}
        onClose={() => { setMode('closed'); setSelectedDish(null) }}
      >
        {mode === 'create' ? (
          <div className="space-y-5">
            <div><p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Nuova ricetta</p><h2 className="text-xl font-bold">Crea il tuo piatto</h2></div>
            <DishEditor initialName="" initialItems={[]} onSave={createDish} onCancel={() => setMode('closed')} saveLabel="Salva piatto" />
          </div>
        ) : mode === 'edit' && selectedDish ? (
          <div className="space-y-5">
            <div><p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Modifica ricetta</p><h2 className="text-xl font-bold">{selectedDish.name}</h2></div>
            <DishEditor initialName={selectedDish.name} initialItems={selectedDish.items.map(toDraft)} onSave={updateDish} onCancel={() => setMode('detail')} saveLabel="Salva modifiche" />
          </div>
        ) : selectedDish ? (
          <DishDetail
            dish={selectedDish}
            pantry={pantry}
            onEdit={selectedDish.id.startsWith('suggested:') ? undefined : () => setMode('edit')}
            onDelete={selectedDish.id.startsWith('suggested:') ? undefined : deleteDish}
            onSave={selectedDish.id.startsWith('suggested:') ? saveSuggestedDish : undefined}
          />
        ) : null}
      </Modal>
    </div>
  )
}

function DishDetail({ dish, pantry, onEdit, onDelete, onSave }: {
  dish: Dish
  pantry: PantryItem[]
  onEdit?: () => void
  onDelete?: () => void
  onSave?: () => void
}) {
  const totals = dishTotals(dish)
  const extendedTotals = getExtendedNutritionTotals(dish.items)
  const availability = getDishAvailability(dish, pantry)
  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-primary-600/25 to-gray-800 p-5 ring-1 ring-primary-500/20">
        <span className="text-3xl">{getFoodIcon(dish.items)}</span>
        <h2 className="mt-3 text-2xl font-bold">{dish.name}</h2>
        <p className="mt-1 text-sm text-gray-400">{Math.round(totals.weight)} g · {Math.round(totals.calories)} kcal</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <span className="rounded-xl bg-black/15 py-2">P <b>{Math.round(totals.protein)}g</b></span>
          <span className="rounded-xl bg-black/15 py-2">C <b>{Math.round(totals.carbs)}g</b></span>
          <span className="rounded-xl bg-black/15 py-2">G <b>{Math.round(totals.fat)}g</b></span>
        </div>
        <ExtendedNutrition totals={extendedTotals} />
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Ingredienti</p>
        <div className="space-y-2">
          {dish.items.map(item => {
            const available = availability.available.some(candidate => candidate.id === item.id)
            return (
              <div key={item.id} className="flex items-center justify-between rounded-xl bg-gray-900/35 px-3 py-2.5 text-sm">
                <span><span className={available ? 'text-primary-400' : 'text-gray-600'}>{available ? '✓' : '○'}</span> {item.food_name}</span>
                <span className="text-gray-500">{item.quantity_g} g</span>
              </div>
            )
          })}
        </div>
      </div>
      {onSave ? (
        <button type="button" onClick={onSave} className="w-full rounded-2xl bg-primary-500 py-3.5 font-semibold hover:bg-primary-400">Salva nei miei piatti</button>
      ) : (
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <button type="button" onClick={onEdit} className="rounded-2xl bg-primary-500 py-3.5 font-semibold hover:bg-primary-400">Modifica piatto</button>
          <button type="button" onClick={onDelete} className="rounded-2xl border border-red-900 px-4 text-red-400 hover:bg-red-950/30" aria-label="Elimina piatto">🗑️</button>
        </div>
      )}
    </div>
  )
}
