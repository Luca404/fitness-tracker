import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import * as api from '../../services/api'
import Modal from '../common/Modal'
import DishEditor, { type DishItemDraft } from '../meals/DishEditor'
import DishIconChoices from './DishIconChoices'
import { getDishIcon, getFoodIcon } from '../../utils/foodIcons'
import { getExtendedNutritionTotals } from '../../utils/extendedNutrition'
import { DISH_MEAL_TYPES, dishMealTypeLabels } from '../../data/dishMealTypes'
import type { Dish, DishMealType } from '../../types'
import ExtendedNutrition from '../meals/ExtendedNutrition'
import PreparedDishesPanel from '../meals/PreparedDishesPanel'
import { formatDecimal } from '../../utils/decimal'

import { dishTotals, dishItemToDraft } from '../../utils/dishes'

type EditorMode = 'closed' | 'create' | 'detail' | 'edit' | 'icon'

export default function KitchenDishes() {
  const { user } = useAuth()
  const { showToast, setDishIcon, refreshDiary } = useData()
  const [dishes, setDishes] = useState<Dish[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<DishMealType | 'all'>('all')
  const [mode, setMode] = useState<EditorMode>('closed')
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null)
  const [iconReturnMode, setIconReturnMode] = useState<'closed' | 'detail'>('closed')
  const [iconSaving, setIconSaving] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setDishes(await api.getDishes())
    } catch {
      showToast('Errore caricamento Cucina')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { refresh() }, [refresh])

  const visibleDishes = dishes.filter(dish => (category === 'all' || dish.meal_types.includes(category))
    && dish.name.toLowerCase().includes(query.trim().toLowerCase()))

  function openDetail(dish: Dish) {
    setSelectedDish(dish)
    setMode('detail')
  }

  function openIconPicker(dish: Dish, returnMode: 'closed' | 'detail') {
    setSelectedDish(dish)
    setIconReturnMode(returnMode)
    setMode('icon')
  }

  function closeIconPicker() {
    setMode(iconReturnMode)
    if (iconReturnMode === 'closed') setSelectedDish(null)
  }

  async function saveDishIcon(icon: string | null) {
    if (!selectedDish || iconSaving) return
    setIconSaving(true)
    try {
      await api.updateDishIcon(selectedDish.id, icon)
      setDishIcon(selectedDish.id, icon)
      setDishes(current => current.map(dish => dish.id === selectedDish.id ? { ...dish, icon } : dish))
      setSelectedDish({ ...selectedDish, icon })
      closeIconPicker()
      showToast('Icona aggiornata')
    } catch {
      showToast('Errore modifica icona')
    } finally {
      setIconSaving(false)
    }
  }

  async function createDish(name: string, items: DishItemDraft[], mealTypes: DishMealType[]) {
    if (!user) return
    try {
      await api.createDish(user.id, name, items, mealTypes)
      await refresh()
      setMode('closed')
      showToast('Piatto salvato')
    } catch {
      showToast('Errore creazione piatto')
      throw new Error('create failed')
    }
  }

  async function updateDish(name: string, items: DishItemDraft[], mealTypes: DishMealType[]) {
    if (!selectedDish) return
    try {
      await api.updateDish(selectedDish.id, name, items, mealTypes)
      await refreshDiary()
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
      await refreshDiary()
      await refresh()
      setSelectedDish(null)
      setMode('closed')
      showToast('Piatto eliminato')
    } catch {
      showToast('Errore eliminazione piatto')
    }
  }


  return (
    <div className="space-y-6">
      <PreparedDishesPanel mealType={category === 'all' ? undefined : category} />
      <button type="button" onClick={() => { setSelectedDish(null); setMode('create') }}
        className="flex w-full items-center gap-3 rounded-2xl bg-primary-500 px-4 py-3.5 text-left font-semibold shadow-lg shadow-primary-950/30 hover:bg-primary-400">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-xl">+</span>
        <span><span className="block">Crea un nuovo piatto</span><span className="block text-xs font-normal text-primary-100">Componi la ricetta ingrediente per ingrediente</span></span>
      </button>

      <section>
        <div className="mb-3 flex items-end justify-between px-1">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Ricettario</p><h2 className="mt-1 text-lg font-bold">I tuoi piatti</h2></div>
          <span className="rounded-full bg-gray-800 px-2.5 py-1 text-xs text-gray-500">{visibleDishes.length}</span>
        </div>
        <div role="group" aria-label="Categoria dei piatti" className="mb-3 flex flex-wrap gap-2">
          {[{ id: 'all' as const, label: 'Tutti', icon: '📖' }, ...DISH_MEAL_TYPES].map(type => (
            <button key={type.id} type="button" onClick={() => setCategory(type.id)}
              aria-pressed={category === type.id}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${category === type.id
                ? 'border-primary-400/50 bg-primary-500 text-white shadow-md shadow-primary-950/30'
                : 'border-gray-700/70 bg-gray-800/70 text-gray-400 hover:border-gray-600 hover:bg-gray-700 hover:text-white'}`}>
              <span aria-hidden="true">{type.icon}</span>
              {type.label}
            </button>
          ))}
        </div>
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cerca un piatto..."
          className="mb-3 w-full rounded-2xl border border-gray-700 bg-gray-800/70 px-4 py-3 text-sm outline-none focus:border-primary-500" />
        {loading ? (
          <div className="h-32 animate-pulse rounded-2xl bg-gray-800" />
        ) : visibleDishes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-700 py-8 text-center">
            <span className="text-3xl">📖</span>
            <p className="mt-2 text-sm text-gray-500">{dishes.length === 0 ? 'Nessun piatto salvato' : query.trim() ? 'Nessun risultato' : 'Nessun piatto in questa categoria'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleDishes.map(dish => {
              const totals = dishTotals(dish)
              return (
                <div key={dish.id} className="flex w-full items-center gap-2 rounded-2xl border border-gray-800 bg-gray-800/55 p-2 text-left hover:border-gray-700">
                  <button type="button" onClick={() => openIconPicker(dish, 'closed')}
                    aria-label={`Cambia icona di ${dish.name}`}
                    className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-700/60 text-xl">
                    {getDishIcon(dish)}<span aria-hidden="true" className="absolute -bottom-1 -right-1 rounded-full bg-gray-700 px-1 text-[10px]">✎</span>
                  </button>
                  <button type="button" onClick={() => openDetail(dish)} className="flex min-w-0 flex-1 items-center gap-2 py-1 pr-1 text-left">
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{dish.name}</span><span className="text-xs text-gray-500">{dish.items.length} ingredienti · {formatDecimal(totals.weight)} g{totals.volumeMl > 0 && <> + {formatDecimal(totals.volumeMl)} ml</>}</span><span className="block truncate text-[11px] text-primary-400/80">{dishMealTypeLabels(dish.meal_types)}</span></span>
                    <span className="text-sm font-semibold text-primary-400">{formatDecimal(totals.calories)}<small className="ml-1 text-[9px]">kcal</small></span>
                    <span className="text-gray-600">›</span>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <Modal
        key={mode}
        open={mode !== 'closed'}
        onClose={() => {
          if (mode === 'icon') closeIconPicker()
          else { setMode('closed'); setSelectedDish(null) }
        }}
        fullScreenOnMobile={mode === 'create' || mode === 'edit'}
      >
        {mode === 'icon' && selectedDish ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Icona di {selectedDish.name}</h2>
            <DishIconChoices automaticIcon={getFoodIcon(selectedDish.items)} selectedIcon={selectedDish.icon}
              onSelect={icon => { void saveDishIcon(icon) }} saving={iconSaving} />
          </div>
        ) : mode === 'create' ? (
          <div className="space-y-5">
            <div className="pr-12 lg:pr-0"><p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Nuova ricetta</p><h2 className="text-xl font-bold">Crea il tuo piatto</h2></div>
            <DishEditor initialName="" initialItems={[]} initialMealTypes={category === 'all' ? [] : [category]} onSave={createDish} onCancel={() => setMode('closed')} saveLabel="Salva piatto" />
          </div>
        ) : mode === 'edit' && selectedDish ? (
          <div className="space-y-5">
            <div className="pr-12 lg:pr-0"><p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Modifica ricetta</p><h2 className="text-xl font-bold">{selectedDish.name}</h2></div>
            <DishEditor initialName={selectedDish.name} initialItems={selectedDish.items.map(dishItemToDraft)} initialMealTypes={selectedDish.meal_types} onSave={updateDish} onCancel={() => setMode('detail')} saveLabel="Salva modifiche" editing />
          </div>
        ) : selectedDish ? (
          <DishDetail
            dish={selectedDish}
            onEdit={() => setMode('edit')}
            onChangeIcon={() => openIconPicker(selectedDish, 'detail')}
            onDelete={deleteDish}
          />
        ) : null}
      </Modal>
    </div>
  )
}

function DishDetail({ dish, onEdit, onChangeIcon, onDelete }: {
  dish: Dish
  onEdit?: () => void
  onChangeIcon?: () => void
  onDelete?: () => void
}) {
  const totals = dishTotals(dish)
  const extendedTotals = getExtendedNutritionTotals(dish.items)
  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-primary-600/25 to-gray-800 p-5 ring-1 ring-primary-500/20">
        {onChangeIcon ? (
          <button type="button" onClick={onChangeIcon} aria-label={`Cambia icona di ${dish.name}`}
            className="relative text-3xl">
            {getDishIcon(dish)}<span aria-hidden="true" className="absolute -bottom-1 -right-3 rounded-full bg-gray-700 px-1 text-[10px]">✎</span>
          </button>
        ) : <span className="text-3xl">{getDishIcon(dish)}</span>}
        <h2 className="mt-3 text-2xl font-bold">{dish.name}</h2>
        <p className="mt-1 text-xs text-primary-400">{dishMealTypeLabels(dish.meal_types ?? ['lunch'])}</p>
        <p className="mt-1 text-sm text-gray-400">{formatDecimal(totals.weight)} g{totals.volumeMl > 0 && <> + {formatDecimal(totals.volumeMl)} ml</>} · {formatDecimal(totals.calories)} kcal</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <span className="rounded-xl bg-black/15 py-2">P <b>{formatDecimal(totals.protein)}g</b></span>
          <span className="rounded-xl bg-black/15 py-2">C <b>{formatDecimal(totals.carbs)}g</b></span>
          <span className="rounded-xl bg-black/15 py-2">G <b>{formatDecimal(totals.fat)}g</b></span>
        </div>
        <ExtendedNutrition totals={extendedTotals} />
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Ingredienti</p>
        <div className="space-y-2">
          {dish.items.map(item => {
            return (
              <div key={item.id} className="flex items-center justify-between rounded-xl bg-gray-900/35 px-3 py-2.5 text-sm">
                <span>{item.food_name}</span>
                <span className="text-gray-500">{formatDecimal(item.quantity_g)} {item.unit ?? 'g'}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <button type="button" onClick={onEdit} className="rounded-2xl bg-primary-500 py-3.5 font-semibold hover:bg-primary-400">Modifica piatto</button>
        <button type="button" onClick={onDelete} className="rounded-2xl border border-red-900 px-4 text-red-400 hover:bg-red-950/30" aria-label="Elimina piatto">🗑️</button>
      </div>
    </div>
  )
}
