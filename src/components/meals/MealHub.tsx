import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import * as api from '../../services/api'
import DishEditor, { type DishItemDraft } from './DishEditor'
import { BASIC_FOODS, type BasicFood } from '../../data/basicFoods'
import type { Dish, DishItem } from '../../types'

interface Props {
  onAddEntry: (name: string, items: DishItemDraft[]) => Promise<void>
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
    category: i.category,
    food_key: i.food_key,
    pantry_item_id: i.pantry_item_id ?? null,
  }
}

const QUICK_BEVERAGE_IDS = new Set([
  'acqua-naturale', 'acqua-frizzante', 'coca-cola', 'coca-cola-zero',
  'succo-arancia', 'te-freddo', 'caffe-nero', 'birra-chiara', 'vino-rosso', 'vino-bianco', 'spritz',
])
const QUICK_BEVERAGES = BASIC_FOODS.filter(food => QUICK_BEVERAGE_IDS.has(food.id))

function defaultBeverageVolume(beverage: BasicFood) {
  if (beverage.id.startsWith('vino') || beverage.id === 'spritz') return 150
  if (beverage.id === 'caffe-nero') return 40
  if (beverage.id.includes('acqua')) return 500
  return 330
}

function beverageEmoji(beverage: BasicFood) {
  if (beverage.id.includes('acqua')) return '💧'
  if (beverage.id === 'birra-chiara') return '🍺'
  if (beverage.id.startsWith('vino')) return '🍷'
  if (beverage.id === 'spritz') return '🍹'
  if (beverage.id === 'caffe-nero') return '☕'
  return '🥤'
}

function beverageToDraft(beverage: BasicFood, volumeMl: number): DishItemDraft {
  const factor = volumeMl / 100
  return {
    food_name: beverage.name,
    quantity_g: volumeMl,
    unit: 'ml',
    calories: Math.round(beverage.calories * factor),
    protein_g: Math.round(beverage.protein_g * factor * 10) / 10,
    carbs_g: Math.round(beverage.carbs_g * factor * 10) / 10,
    fat_g: Math.round(beverage.fat_g * factor * 10) / 10,
    source: 'basic',
    off_food_id: null,
    category: beverage.category,
    food_key: `basic:${beverage.id}`,
    pantry_item_id: null,
  }
}

type Mode = 'list' | 'new' | 'oneoff' | 'edit' | 'pick'

export default function MealHub({ onAddEntry }: Props) {
  const { user } = useAuth()
  const { showToast } = useData()
  const [dishes, setDishes] = useState<Dish[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('list')
  const [editingDish, setEditingDish] = useState<Dish | null>(null)
  const [pickingDish, setPickingDish] = useState<Dish | null>(null)
  const [targetWeight, setTargetWeight] = useState(0)
  const [selectedBeverage, setSelectedBeverage] = useState<BasicFood | null>(null)
  const [beverageVolume, setBeverageVolume] = useState(330)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setDishes(await api.getDishes())
    } catch {
      showToast('Errore caricamento piatti')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { refresh() }, [refresh])

  function startPick(dish: Dish) {
    setPickingDish(dish)
    setTargetWeight(Math.round(referenceWeight(dish)))
    setSelectedBeverage(null)
    setMode('pick')
  }

  function chooseBeverage(beverage: BasicFood) {
    setSelectedBeverage(beverage)
    setBeverageVolume(defaultBeverageVolume(beverage))
  }

  function startEdit(dish: Dish) {
    setEditingDish(dish)
    setMode('edit')
  }

  async function handleDelete(id: string) {
    const dish = dishes.find(item => item.id === id)
    if (!window.confirm(`Eliminare “${dish?.name ?? 'questo piatto'}” dai piatti salvati?`)) return
    try {
      await api.deleteDish(id)
      await refresh()
    } catch {
      showToast('Errore eliminazione piatto')
    }
  }

  async function confirmPick() {
    if (!pickingDish) return
    const ref = referenceWeight(pickingDish)
    const factor = ref > 0 ? targetWeight / ref : 1
    const dishItems: DishItemDraft[] = pickingDish.items.map(i => ({
      food_name: i.food_name,
      quantity_g: Math.round(i.quantity_g * factor * 10) / 10,
      calories: Math.round(i.calories * factor),
      protein_g: Math.round(i.protein_g * factor * 10) / 10,
      carbs_g: Math.round(i.carbs_g * factor * 10) / 10,
      fat_g: Math.round(i.fat_g * factor * 10) / 10,
      source: i.source,
      off_food_id: i.off_food_id,
      category: i.category,
      food_key: i.food_key,
      pantry_item_id: i.pantry_item_id ?? null,
    }))
    const beverageItem = selectedBeverage && beverageVolume > 0
      ? beverageToDraft(selectedBeverage, beverageVolume)
      : null
    await onAddEntry(pickingDish.name, beverageItem ? [...dishItems, beverageItem] : dishItems)
    setPickingDish(null)
    setMode('list')
  }

  async function handleSaveNewDish(name: string, items: DishItemDraft[]) {
    if (!user) return
    await api.createDish(user.id, name, items)
    await onAddEntry(name, items)
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

  async function handleSaveOneoff(name: string, items: DishItemDraft[]) {
    await onAddEntry(name, items)
    setMode('list')
  }

  if (mode === 'new') {
    return (
      <div className="space-y-5">
        <ComposerHeader icon="🍳" eyebrow="Nuova ricetta" title="Componi il tuo piatto" description="Lo salveremo tra i preferiti e nel diario di oggi." />
        <DishEditor
          initialName=""
          initialItems={[]}
          requireName
          saveLabel="Salva e aggiungi"
          onSave={handleSaveNewDish}
          onCancel={() => setMode('list')}
        />
      </div>
    )
  }

  if (mode === 'edit' && editingDish) {
    return (
      <div className="space-y-5">
        <ComposerHeader icon="⚙️" eyebrow="Piatto salvato" title="Modifica la ricetta" description="Le modifiche varranno per i prossimi inserimenti." />
        <DishEditor
          initialName={editingDish.name}
          initialItems={editingDish.items.map(toDraftItem)}
          requireName
          saveLabel="Salva modifiche"
          onSave={handleSaveEditedDish}
          onCancel={() => { setEditingDish(null); setMode('list') }}
        />
      </div>
    )
  }

  if (mode === 'oneoff') {
    return (
      <div className="space-y-5">
        <ComposerHeader icon="✨" eyebrow="Inserimento veloce" title="Piatto occasionale" description="Perfetto per ristorante, aperitivo o qualcosa che non vuoi salvare." />
        <DishEditor
          initialName=""
          initialItems={[]}
          requireName
          saveLabel="Aggiungi al diario"
          onSave={handleSaveOneoff}
          onCancel={() => setMode('list')}
        />
      </div>
    )
  }

  if (mode === 'pick' && pickingDish) {
    const ref = referenceWeight(pickingDish)
    const factor = ref > 0 ? targetWeight / ref : 1
    const beverageItem = selectedBeverage && beverageVolume > 0
      ? beverageToDraft(selectedBeverage, beverageVolume)
      : null
    const scaledKcal = Math.round(totalKcal(pickingDish) * factor) + (beverageItem?.calories ?? 0)
    const protein = pickingDish.items.reduce((sum, item) => sum + item.protein_g, 0) * factor + (beverageItem?.protein_g ?? 0)
    const carbs = pickingDish.items.reduce((sum, item) => sum + item.carbs_g, 0) * factor + (beverageItem?.carbs_g ?? 0)
    const fat = pickingDish.items.reduce((sum, item) => sum + item.fat_g, 0) * factor + (beverageItem?.fat_g ?? 0)
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setMode('list')} className="text-sm text-gray-400 hover:text-white">← Cambia piatto</button>
          <span className="rounded-full bg-primary-500/10 px-3 py-1 text-xs font-medium text-primary-400">Piatto salvato</span>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-primary-600/25 via-gray-800 to-gray-800 p-5 ring-1 ring-primary-500/20">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/15 text-3xl">🍲</div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-xl font-bold">{pickingDish.name}</h3>
              <p className="text-sm text-gray-400">Ricetta base: {Math.round(ref)} g</p>
            </div>
            <p className="text-xl font-bold text-primary-400">{scaledKcal}<span className="ml-1 text-xs font-normal">kcal</span></p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <MacroPill label="Proteine" value={protein} />
            <MacroPill label="Carbo" value={carbs} />
            <MacroPill label="Grassi" value={fat} />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-700 bg-gray-900/30 p-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Quanto ne hai mangiato?</label>
          <div className="mt-2 flex items-center gap-3">
            <input type="number" min={1} value={targetWeight === 0 ? '' : targetWeight}
              onChange={e => setTargetWeight(parseInt(e.target.value) || 0)}
              className="min-w-0 flex-1 bg-transparent text-3xl font-bold outline-none" />
            <span className="text-lg text-gray-500">grammi</span>
          </div>
        </div>
        <section className="rounded-2xl border border-gray-700 bg-gray-900/25 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Bevanda</p>
              <p className="mt-0.5 text-sm text-gray-400">Opzionale</p>
            </div>
            <span className="text-2xl">🥤</span>
          </div>

          {selectedBeverage ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-gray-800 p-3">
                <span className="text-xl">{beverageEmoji(selectedBeverage)}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{selectedBeverage.name}</span>
                <button type="button" onClick={() => setSelectedBeverage(null)} className="text-xs text-gray-500 hover:text-white">Cambia</button>
              </div>
              <label className="flex items-center rounded-xl border border-gray-700 bg-gray-800/70 px-3 focus-within:border-primary-500">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Quantità</span>
                <input
                  type="number"
                  min={1}
                  value={beverageVolume === 0 ? '' : beverageVolume}
                  onChange={event => setBeverageVolume(parseInt(event.target.value) || 0)}
                  onFocus={event => event.currentTarget.select()}
                  className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-right text-xl font-bold outline-none"
                />
                <span className="text-sm text-gray-500">ml</span>
              </label>
              <p className="text-right text-xs text-primary-400">{beverageItem?.calories ?? 0} kcal</p>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {QUICK_BEVERAGES.map(beverage => (
                <button
                  key={beverage.id}
                  type="button"
                  onClick={() => chooseBeverage(beverage)}
                  className="flex items-center gap-2 rounded-xl border border-gray-700/80 bg-gray-800/60 px-3 py-2.5 text-left text-xs transition hover:border-primary-600 hover:bg-primary-950/20"
                >
                  <span className="text-base">{beverageEmoji(beverage)}</span>
                  <span className="truncate">{beverage.name}</span>
                </button>
              ))}
            </div>
          )}
        </section>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Composizione</p>
          {pickingDish.items.map(item => (
            <div key={item.id} className="flex justify-between rounded-xl bg-gray-900/30 px-3 py-2 text-sm">
              <span className="text-gray-300">{item.food_name}</span>
              <span className="text-gray-500">{Math.round(item.quantity_g * factor)} g</span>
            </div>
          ))}
          {beverageItem && (
            <div className="flex justify-between rounded-xl bg-primary-950/20 px-3 py-2 text-sm ring-1 ring-primary-500/15">
              <span className="text-gray-300">{beverageEmoji(selectedBeverage!)} {beverageItem.food_name}</span>
              <span className="text-gray-500">{beverageVolume} ml</span>
            </div>
          )}
        </div>
        <button type="button" onClick={confirmPick} disabled={targetWeight <= 0}
          className="w-full rounded-2xl bg-primary-500 py-4 font-semibold shadow-lg shadow-primary-900/30 transition hover:bg-primary-400 disabled:opacity-40">
          Aggiungi {scaledKcal} kcal al diario
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-primary-500/20 via-gray-800 to-gray-800 p-5 ring-1 ring-primary-500/20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-400">Composer</p>
        <h3 className="mt-1 text-xl font-bold">Cosa hai mangiato?</h3>
        <p className="mt-1 text-sm leading-relaxed text-gray-400">Scegli un piatto già pronto oppure costruiscilo ingrediente per ingrediente.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setMode('new')}
          className="rounded-2xl border border-gray-700 bg-gray-900/30 p-4 text-left transition hover:border-primary-600 hover:bg-primary-950/20">
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-xl">🍳</span>
          <span className="block text-sm font-semibold">Nuova ricetta</span>
          <span className="mt-1 block text-xs leading-snug text-gray-500">Componi, salva e registra</span>
        </button>
        <button type="button" onClick={() => setMode('oneoff')}
          className="rounded-2xl border border-gray-700 bg-gray-900/30 p-4 text-left transition hover:border-primary-600 hover:bg-primary-950/20">
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/10 text-xl">✨</span>
          <span className="block text-sm font-semibold">Occasionale</span>
          <span className="mt-1 block text-xs leading-snug text-gray-500">Solo nel diario di oggi</span>
        </button>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">La tua cucina</p>
            <p className="text-sm font-medium text-gray-300">Piatti salvati</p>
          </div>
          <span className="rounded-full bg-gray-700 px-2.5 py-1 text-xs text-gray-400">{dishes.length}</span>
        </div>
        {loading ? (
          <p className="text-sm text-gray-500 text-center py-4">Caricamento...</p>
        ) : dishes.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Nessun piatto salvato ancora.</p>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {dishes.map(dish => (
              <div key={dish.id} className="group flex items-center gap-2 rounded-2xl border border-gray-700/70 bg-gray-900/30 p-2 transition hover:border-gray-600">
                <button type="button" onClick={() => startPick(dish)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 text-left">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10">🍲</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{dish.name}</span>
                    <span className="text-xs text-gray-500">{Math.round(totalKcal(dish))} kcal · {Math.round(referenceWeight(dish))} g</span>
                  </span>
                </button>
                <button type="button" onClick={() => startEdit(dish)}
                  className="rounded-xl p-2 text-gray-500 hover:bg-gray-700 hover:text-gray-200" aria-label="Modifica piatto">✎</button>
                <button type="button" onClick={() => handleDelete(dish.id)}
                  className="rounded-xl p-2 text-gray-600 hover:bg-red-950/30 hover:text-red-400" aria-label="Elimina piatto">🗑️</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ComposerHeader({ icon, eyebrow, title, description }: {
  icon: string
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl bg-gray-900/35 p-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-500/10 text-2xl">{icon}</span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">{eyebrow}</p>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p>
      </div>
    </div>
  )
}

function MacroPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-black/15 p-2">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-semibold">{Math.round(value)}g</p>
    </div>
  )
}
