import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import * as api from '../../services/api'
import DishEditor, { type DishItemDraft } from './DishEditor'
import type { Dish, DishItem } from '../../types'

interface Props {
  onAddItems: (items: DishItemDraft[]) => Promise<void>
}

function referenceWeight(dish: Dish): number {
  return dish.items.reduce((s, i) => s + i.quantity_g, 0)
}

function totalKcal(dish: Dish): number {
  return dish.items.reduce((s, i) => s + i.calories, 0)
}

function toDraftItem(i: DishItem): DishItemDraft {
  return {
    food_name: i.food_name,
    quantity_g: i.quantity_g,
    calories: i.calories,
    protein_g: i.protein_g,
    carbs_g: i.carbs_g,
    fat_g: i.fat_g,
    source: i.source,
    off_food_id: i.off_food_id,
  }
}

type Mode = 'list' | 'new' | 'oneoff' | 'edit' | 'pick'

export default function MealHub({ onAddItems }: Props) {
  const { user } = useAuth()
  const [dishes, setDishes] = useState<Dish[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('list')
  const [editingDish, setEditingDish] = useState<Dish | null>(null)
  const [pickingDish, setPickingDish] = useState<Dish | null>(null)
  const [targetWeight, setTargetWeight] = useState(0)

  async function refresh() {
    setLoading(true)
    try {
      setDishes(await api.getDishes())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  function startPick(dish: Dish) {
    setPickingDish(dish)
    setTargetWeight(Math.round(referenceWeight(dish)))
    setMode('pick')
  }

  function startEdit(dish: Dish) {
    setEditingDish(dish)
    setMode('edit')
  }

  async function handleDelete(id: string) {
    await api.deleteDish(id)
    await refresh()
  }

  async function confirmPick() {
    if (!pickingDish) return
    const ref = referenceWeight(pickingDish)
    const factor = ref > 0 ? targetWeight / ref : 1
    await onAddItems(pickingDish.items.map(i => ({
      food_name: i.food_name,
      quantity_g: Math.round(i.quantity_g * factor * 10) / 10,
      calories: Math.round(i.calories * factor),
      protein_g: Math.round(i.protein_g * factor * 10) / 10,
      carbs_g: Math.round(i.carbs_g * factor * 10) / 10,
      fat_g: Math.round(i.fat_g * factor * 10) / 10,
      source: i.source,
      off_food_id: i.off_food_id,
    })))
    setPickingDish(null)
    setMode('list')
  }

  async function handleSaveNewDish(name: string, items: DishItemDraft[]) {
    if (!user) return
    await api.createDish(user.id, name, items)
    await onAddItems(items)
    setMode('list')
    await refresh()
  }

  async function handleSaveEditedDish(name: string, items: DishItemDraft[]) {
    if (!editingDish) return
    await api.updateDish(editingDish.id, name, items)
    setEditingDish(null)
    setMode('list')
    await refresh()
  }

  async function handleSaveOneoff(_name: string, items: DishItemDraft[]) {
    await onAddItems(items)
    setMode('list')
  }

  if (mode === 'new') {
    return (
      <DishEditor
        initialName=""
        initialItems={[]}
        requireName
        saveLabel="Salva e aggiungi al pasto"
        onSave={handleSaveNewDish}
        onCancel={() => setMode('list')}
      />
    )
  }

  if (mode === 'edit' && editingDish) {
    return (
      <DishEditor
        initialName={editingDish.name}
        initialItems={editingDish.items.map(toDraftItem)}
        requireName
        saveLabel="Salva modifiche"
        onSave={handleSaveEditedDish}
        onCancel={() => { setEditingDish(null); setMode('list') }}
      />
    )
  }

  if (mode === 'oneoff') {
    return (
      <DishEditor
        initialName=""
        initialItems={[]}
        requireName={false}
        saveLabel="Aggiungi al pasto"
        onSave={handleSaveOneoff}
        onCancel={() => setMode('list')}
      />
    )
  }

  if (mode === 'pick' && pickingDish) {
    const ref = referenceWeight(pickingDish)
    const factor = ref > 0 ? targetWeight / ref : 1
    const scaledKcal = Math.round(totalKcal(pickingDish) * factor)
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="font-medium text-sm">{pickingDish.name}</span>
          <button type="button" onClick={() => setMode('list')} className="text-gray-400 text-sm">Cambia</button>
        </div>
        <div>
          <label className="text-sm text-gray-400">Peso totale (g)</label>
          <input type="number" min={1} value={targetWeight}
            onChange={e => setTargetWeight(parseInt(e.target.value) || 0)}
            className="w-full mt-1 px-3 py-2 rounded bg-gray-600 border border-gray-500 outline-none" />
        </div>
        <p className="text-sm text-primary-400">{scaledKcal} kcal totali</p>
        <button type="button" onClick={confirmPick}
          className="w-full py-3 bg-primary-600 rounded-lg font-semibold">
          Aggiungi al pasto
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setMode('new')}
          className="py-4 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-medium text-center leading-tight">
          🍳 Nuovo piatto<br /><span className="text-xs text-gray-400 font-normal">lo cucini, lo salvi</span>
        </button>
        <button type="button" onClick={() => setMode('oneoff')}
          className="py-4 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-medium text-center leading-tight">
          🍽️ Piatto occasionale<br /><span className="text-xs text-gray-400 font-normal">solo per oggi</span>
        </button>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500 px-1 mb-1">Piatti salvati</p>
        {loading ? (
          <p className="text-sm text-gray-500 text-center py-4">Caricamento...</p>
        ) : dishes.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Nessun piatto salvato ancora.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1">
            {dishes.map(dish => (
              <div key={dish.id} className="flex items-center gap-1">
                <button type="button" onClick={() => startPick(dish)}
                  className="flex-1 text-left px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm min-w-0">
                  <span className="font-medium">{dish.name}</span>
                  <span className="text-gray-500 ml-2">
                    {Math.round(totalKcal(dish))} kcal · {Math.round(referenceWeight(dish))}g
                  </span>
                </button>
                <button type="button" onClick={() => startEdit(dish)}
                  className="px-2 py-2 text-gray-400" aria-label="Modifica piatto">⚙️</button>
                <button type="button" onClick={() => handleDelete(dish.id)}
                  className="px-2 py-2 text-gray-500" aria-label="Elimina piatto">🗑️</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
