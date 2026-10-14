import FormActions from '../common/FormActions'
import { Fragment, useRef, useState } from 'react'
import FoodSearch from './FoodSearch'
import type { DishItemDraft, DishMealType, PieceSize } from '../../types'
import { DISH_MEAL_TYPES } from '../../data/dishMealTypes'
import IngredientPortionCard from './IngredientPortionCard'
import { formatDecimal } from '../../utils/decimal'

export type { DishItemDraft } from '../../types'
import { nutritionTotals, nutritionValidationError, scaleIngredient } from '../../utils/nutrition'

interface Props {
  initialName: string
  initialItems: DishItemDraft[]
  initialMealTypes?: DishMealType[]
  onSave: (name: string, items: DishItemDraft[], mealTypes: DishMealType[]) => Promise<void>
  onCancel: () => void
  requireName?: boolean
  saveLabel?: string
  showMealTypes?: boolean
  separateCustomizations?: boolean
  editing?: boolean
}

export default function DishEditor({
  initialName, initialItems, initialMealTypes = ['lunch'], onSave, onCancel,
  requireName = true, saveLabel = 'Salva piatto', showMealTypes = true, separateCustomizations = false, editing = false,
}: Props) {
  const [name, setName] = useState(initialName)
  const [mealTypes, setMealTypes] = useState<DishMealType[]>(initialMealTypes)
  const [items, setItems] = useState<DishItemDraft[]>(initialItems)
  const [itemKeys, setItemKeys] = useState(() => initialItems.map((_, index) => index))
  const nextItemKey = useRef(initialItems.length)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invalidQuantities, setInvalidQuantities] = useState<number[]>([])

  const { weight: totalWeight, volumeMl: totalVolume, calories: totalKcal, protein: totalProtein, carbs: totalCarbs, fat: totalFat } = nutritionTotals(items)
  const orderedItems = items.map((item, index) => ({ item, index }))
  if (separateCustomizations) orderedItems.sort((a, b) => Number(Boolean(a.item.is_customization)) - Number(Boolean(b.item.is_customization)))

  function updateQuantity(index: number, quantity_g: number) {
    if (!Number.isFinite(quantity_g) || quantity_g <= 0) return
    setItems(prev => prev.map((it, i) => {
      if (i !== index) return it
      return scaleIngredient(it, quantity_g)
    }))
  }

  function updatePiece(index: number, piece: { size: PieceSize; count: number } | null) {
    setItems(prev => prev.map((item, itemIndex) => itemIndex === index
      ? { ...item, piece_count: piece?.count ?? null, piece_size: piece?.size ?? null }
      : item))
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
    setItemKeys(current => current.filter((_, i) => i !== index))
    setInvalidQuantities(current => current.filter(i => i !== index).map(i => i > index ? i - 1 : i))
  }

  const nameValid = !requireName || name.trim().length > 0
  const itemsValid = invalidQuantities.length === 0 && items.every(i => Number.isFinite(i.quantity_g) && i.quantity_g > 0 && !nutritionValidationError(i))
  const canSave = nameValid && (!showMealTypes || mealTypes.length > 0) && items.length > 0 && itemsValid && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      await onSave(name.trim(), items, mealTypes)
    } catch {
      setError('Operazione non riuscita. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {requireName && (
        <div className="rounded-2xl border border-gray-700 bg-gray-900/30 p-4 focus-within:border-primary-600">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nome del piatto</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Es. Pasta al pomodoro"
            className="mt-1 w-full bg-transparent text-xl font-semibold text-white outline-none placeholder:text-gray-600" />
        </div>
      )}

      {showMealTypes && (
        <fieldset className="rounded-2xl border border-gray-700 bg-gray-900/30 p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Categorie del piatto</legend>
          <p className="mb-3 text-xs text-gray-500">Puoi sceglierne più di una.</p>
          <div className="grid grid-cols-2 gap-2">
            {DISH_MEAL_TYPES.map(type => (
              <label key={type.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${mealTypes.includes(type.id)
                ? 'border-primary-500/60 bg-primary-500/15 text-white' : 'border-gray-700 bg-gray-800/50 text-gray-400'}`}>
                <input type="checkbox" checked={mealTypes.includes(type.id)}
                  onChange={event => setMealTypes(current => event.target.checked
                    ? [...current, type.id] : current.filter(value => value !== type.id))}
                  className="accent-primary-500" />
                <span aria-hidden="true">{type.icon}</span>{type.label}
              </label>
            ))}
          </div>
          {mealTypes.length === 0 && <p className="mt-2 text-xs text-amber-400">Scegli almeno una categoria.</p>}
        </fieldset>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Aggiungi ingredienti</p>
          <span className="text-xs text-gray-600">{items.length} nel piatto</span>
        </div>
        <div className="rounded-2xl border border-gray-700/80 bg-gray-900/25 p-3">
          <FoodSearch
            hideHeader
            resetAfterAdd
            allowManualEntry={!showMealTypes && !separateCustomizations}
            onClose={() => {}}
            onAdd={(item) => {
              const key = nextItemKey.current++
              setItemKeys(current => [...current, key])
              setItems(prev => [...prev, { ...item, is_customization: separateCustomizations }])
            }}
          />
        </div>
      </section>

      <section className="space-y-2">
        {items.length > 0 && (
          <p className="px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Composizione</p>
        )}
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-700 py-7 text-center">
            <span className="text-2xl">🥕</span>
            <p className="mt-2 text-sm text-gray-500">Cerca e aggiungi il primo ingrediente</p>
          </div>
        )}
        {orderedItems.map(({ item, index: i }, position) => (
          <Fragment key={itemKeys[i]}>
          {separateCustomizations && (position === 0 || Boolean(orderedItems[position - 1].item.is_customization) !== Boolean(item.is_customization)) && (
            <p className="px-1 pt-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {item.is_customization ? 'Ingredienti aggiunti' : 'Ricetta base'}
            </p>
          )}
          <IngredientPortionCard item={item} disabled={saving}
            onQuantityChange={value => updateQuantity(i, value)} onPieceChange={piece => updatePiece(i, piece)}
            onValidityChange={valid => setInvalidQuantities(current => valid ? current.filter(index => index !== i)
              : current.includes(i) ? current : [...current, i])}
            onRemove={() => removeItem(i)} />
          </Fragment>
        ))}
      </section>

      {items.length > 0 && <p className="text-xs text-gray-500">Per correggere i valori nutrizionali di un ingrediente salvato, modificalo in Cucina → Ingredienti.</p>}

      {items.length > 0 && (
        <div className="rounded-3xl bg-gradient-to-r from-primary-600/20 to-emerald-400/5 p-4 ring-1 ring-primary-500/20">
          <div className="flex items-end justify-between">
            <div><p className="text-xs text-gray-500">Totale piatto</p><p className="text-2xl font-bold">{formatDecimal(totalKcal)} <span className="text-sm font-normal text-primary-400">kcal</span></p></div>
            <p className="text-sm text-gray-400">
              {formatDecimal(totalWeight)} g{totalVolume > 0 ? ` + ${formatDecimal(totalVolume)} ml` : ''}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <span className="rounded-lg bg-black/10 py-1.5 text-gray-400">P <b className="text-gray-200">{formatDecimal(totalProtein)}g</b></span>
            <span className="rounded-lg bg-black/10 py-1.5 text-gray-400">{editing ? 'C' : 'C tot.'} <b className="text-gray-200">{formatDecimal(totalCarbs)}g</b></span>
            <span className="rounded-lg bg-black/10 py-1.5 text-gray-400">{editing ? 'G' : 'G tot.'} <b className="text-gray-200">{formatDecimal(totalFat)}g</b></span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400" role="alert">{error}</p>}

      <FormActions onSave={() => void handleSave()} onCancel={onCancel} saveLabel={saveLabel} saving={saving} disabled={!canSave} />
    </div>
  )
}
