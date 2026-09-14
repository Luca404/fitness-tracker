import { useState } from 'react'
import FoodSearch from './FoodSearch'
import type { DishItem } from '../../types'

export type DishItemDraft = Omit<DishItem, 'id' | 'dish_id' | 'created_at'>

interface Props {
  initialName: string
  initialItems: DishItemDraft[]
  onSave: (name: string, items: DishItemDraft[]) => Promise<void>
  onCancel: () => void
  requireName?: boolean
  saveLabel?: string
}

export default function DishEditor({
  initialName, initialItems, onSave, onCancel,
  requireName = true, saveLabel = 'Salva piatto',
}: Props) {
  const [name, setName] = useState(initialName)
  const [items, setItems] = useState<DishItemDraft[]>(initialItems)
  const [searchKey, setSearchKey] = useState(0)
  const [saving, setSaving] = useState(false)

  const totalWeight = items.reduce((s, i) => s + i.quantity_g, 0)
  const totalKcal = items.reduce((s, i) => s + i.calories, 0)

  function updateQuantity(index: number, quantity_g: number) {
    setItems(prev => prev.map((it, i) => {
      if (i !== index) return it
      const factor = it.quantity_g > 0 ? quantity_g / it.quantity_g : 0
      return {
        ...it,
        quantity_g,
        calories: Math.round(it.calories * factor),
        protein_g: Math.round(it.protein_g * factor * 10) / 10,
        carbs_g: Math.round(it.carbs_g * factor * 10) / 10,
        fat_g: Math.round(it.fat_g * factor * 10) / 10,
      }
    }))
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const nameValid = !requireName || name.trim().length > 0
  const canSave = nameValid && items.length > 0 && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave(name.trim(), items)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {requireName && (
        <div>
          <label className="text-sm text-gray-400">Nome piatto</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Es. Pasta al pomodoro"
            className="w-full mt-1 px-3 py-2 rounded bg-gray-700 border border-gray-600 outline-none focus:border-primary-500" />
        </div>
      )}

      <FoodSearch
        key={searchKey}
        hideHeader
        onClose={() => {}}
        onAdd={(item) => {
          setItems(prev => [...prev, item])
          setSearchKey(k => k + 1)
        }}
      />

      <div className="space-y-1">
        {items.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-2">Nessun ingrediente aggiunto.</p>
        )}
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.food_name}</p>
              <span className="text-sm text-primary-400">{Math.round(item.calories)} kcal</span>
            </div>
            <input
              type="number" min={1} value={item.quantity_g}
              onChange={e => updateQuantity(i, parseFloat(e.target.value) || 0)}
              className="w-16 mx-2 px-2 py-1 rounded bg-gray-700 border border-gray-600 text-sm text-right outline-none"
            />
            <span className="text-xs text-gray-500 mr-2">g</span>
            <button type="button" onClick={() => removeItem(i)} className="text-gray-600 hover:text-red-400 text-lg">✕</button>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <p className="text-sm text-gray-400 text-center">
          Totale: {Math.round(totalWeight)}g · {Math.round(totalKcal)} kcal
        </p>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onCancel}
          className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium">
          Annulla
        </button>
        <button type="button" onClick={handleSave} disabled={!canSave}
          className="flex-1 py-3 bg-primary-600 rounded-lg font-semibold disabled:opacity-40">
          {saveLabel}
        </button>
      </div>
    </div>
  )
}
