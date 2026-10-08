import { useRef, useState } from 'react'
import type { DishItemDraft, FoodCategory } from '../../types'
import type { MealPhotoAnalysis } from '../../services/mealPhoto'
import { FOOD_CATEGORIES } from '../../data/foodCategories'
import { consumedPhotoItems } from '../../utils/mealPhoto'
import { nutritionTotals, scaleIngredient } from '../../utils/nutrition'
import { formatDecimal } from '../../utils/decimal'
import FoodSearch from './FoodSearch'

const nutrientLabels = {
  calories: 'Calorie (kcal)', protein_g: 'Proteine (g)',
  carbs_g: 'Carboidrati (g)', fat_g: 'Grassi (g)',
} as const
type Nutrient = keyof typeof nutrientLabels
const nutrientKeys = Object.keys(nutrientLabels) as Nutrient[]

interface ReviewRow {
  id: number
  reference: DishItemDraft
  name: string
  amount: string
  category: FoodCategory
  nutrients: Record<Nutrient, string>
  assumed: boolean
  note: string | null
}

function createRow(item: DishItemDraft, id: number, assumption?: MealPhotoAnalysis['items'][number]): ReviewRow {
  return {
    id, reference: item, name: item.food_name, amount: String(item.quantity_g), category: item.category,
    nutrients: { calories: String(item.calories), protein_g: String(item.protein_g), carbs_g: String(item.carbs_g), fat_g: String(item.fat_g) },
    assumed: assumption?.assumed ?? false, note: assumption?.note ?? null,
  }
}

function rowItem(row: ReviewRow): DishItemDraft | null {
  const quantity = Number(row.amount)
  if (!row.name.trim() || row.name.length > 160 || !row.amount.trim()
    || !Number.isFinite(quantity) || quantity < 0.1 || quantity > 10000
    || nutrientKeys.some(key => !row.nutrients[key].trim()
      || !Number.isFinite(Number(row.nutrients[key])) || Number(row.nutrients[key]) < 0)) return null
  return {
    ...scaleIngredient(row.reference, quantity), food_name: row.name.trim(), category: row.category,
    calories: Number(row.nutrients.calories), protein_g: Number(row.nutrients.protein_g),
    carbs_g: Number(row.nutrients.carbs_g), fat_g: Number(row.nutrients.fat_g),
  }
}

interface Props {
  initialName: string
  initialItems: DishItemDraft[]
  analysis?: MealPhotoAnalysis
  editing?: boolean
  onSave: (name: string, items: DishItemDraft[]) => Promise<void>
  onCancel: () => void
}

export default function MealPhotoReview({ initialName, initialItems, analysis, editing = false, onSave, onCancel }: Props) {
  const [name, setName] = useState(initialName)
  const [rows, setRows] = useState(() => initialItems.map((item, index) => createRow(item, index, analysis?.items[index])))
  const nextId = useRef(initialItems.length)
  const [percentage, setPercentage] = useState('100')
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveLock = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const parsedItems = rows.map(rowItem)
  const validItems = parsedItems.filter((item): item is DishItemDraft => item !== null)
  const percent = editing ? 100 : Number(percentage)
  const consumed = consumedPhotoItems(validItems, percent)
  const totals = nutritionTotals(consumed)
  const valid = name.trim().length > 0 && name.length <= 160 && rows.length > 0
    && validItems.length === rows.length && consumed.length === rows.length
    && consumed.every(item => item.quantity_g > 0)

  function changeQuantity(id: number, amount: string) {
    setRows(current => current.map(row => {
      if (row.id !== id) return row
      const quantity = Number(amount)
      if (!amount.trim() || !Number.isFinite(quantity) || quantity < 0.1 || quantity > 10000) return { ...row, amount }
      const scaled = scaleIngredient(row.reference, quantity)
      return { ...row, amount, nutrients: {
        calories: String(scaled.calories), protein_g: String(scaled.protein_g),
        carbs_g: String(scaled.carbs_g), fat_g: String(scaled.fat_g),
      } }
    }))
  }

  function changeNutrient(id: number, key: Nutrient, value: string) {
    setRows(current => current.map(row => {
      if (row.id !== id) return row
      const updated = { ...row, nutrients: { ...row.nutrients, [key]: value } }
      // Rebase after a valid manual correction so later weight edits preserve it.
      return { ...updated, reference: rowItem(updated) ?? row.reference }
    }))
  }

  async function save() {
    if (!valid || saveLock.current) return
    saveLock.current = true
    setSaving(true)
    setError(null)
    try { await onSave(name.trim(), consumed) }
    catch { setError('Impossibile salvare il piatto. I dati sono ancora qui: riprova.') }
    finally { saveLock.current = false; setSaving(false) }
  }

  const inputClass = 'mt-1 w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white outline-none focus:border-primary-500'

  return <div className="space-y-4">
    <fieldset disabled={saving} className="min-w-0 space-y-4">
      <div className="rounded-2xl border border-primary-500/25 bg-primary-950/20 p-4">
        <span className="text-xs font-semibold text-primary-300">📸 Stimato da foto</span>
        <label className="mt-3 block text-xs text-gray-400">Nome del piatto
          <input value={name} maxLength={160} onChange={event => setName(event.target.value)} className={inputClass} />
        </label>
        <div aria-live="polite" className="mt-4">
          <p className="text-2xl font-bold text-primary-300">≈ {formatDecimal(totals.calories, 0)} <span className="text-sm font-medium">kcal</span></p>
          <p className="mt-1 text-xs text-gray-400">{formatDecimal(totals.weight, 0)} g{totals.volumeMl > 0 ? ` + ${formatDecimal(totals.volumeMl, 0)} ml` : ''} · {editing ? 'Porzione registrata' : 'Quantità che registrerai'}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
            {([
              ['Proteine', totals.protein], ['Carboidrati', totals.carbs], ['Grassi', totals.fat],
            ] as const).map(([label, value]) => <div key={label} className="rounded-xl bg-black/20 py-2">
              <p className="text-xs text-gray-400">{label}</p><p className="mt-1 font-semibold">{formatDecimal(value, 0)} g</p>
            </div>)}
          </div>
        </div>
      </div>
      {!editing && <section className="rounded-2xl border border-gray-700 p-4">
        <p className="text-sm font-semibold">Quanto hai mangiato?</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {([['Tutto', '100'], ['¾', '75'], ['Metà', '50']] as const).map(([label, value]) => <button
            key={value} type="button" aria-pressed={percentage === value} onClick={() => setPercentage(value)}
            className={`rounded-xl border py-2 text-sm ${percentage === value ? 'border-primary-500 bg-primary-500/15 text-primary-300' : 'border-gray-700 text-gray-400'}`}>
            {label}
          </button>)}
        </div>
        <label className="mt-3 block text-xs text-gray-400">Percentuale mangiata
          <input type="number" min="1" max="100" step="1" inputMode="decimal" value={percentage}
            onChange={event => setPercentage(event.target.value)} className={inputClass} />
        </label>
      </section>}
      <p className="text-xs leading-relaxed text-gray-400">Quantità, ingredienti e valori nutrizionali sono approssimativi. Controlla soprattutto porzione e condimenti.</p>
      {analysis && (analysis.confidence === 'low' || analysis.warnings.length > 0) && <div className="rounded-xl border border-amber-600/30 bg-amber-950/20 p-3 text-xs text-amber-200">
        {analysis.confidence === 'low' && <p className="mb-1 font-semibold">Il piatto è difficile da stimare: controlla i dettagli.</p>}
        {analysis.warnings.map((warning, index) => <p key={index}>{warning}</p>)}
      </div>}
      <details className="rounded-2xl border border-gray-700 bg-gray-900/25 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-gray-200">Ingredienti e quantità · {rows.length}</summary>
        <p className="mt-3 text-xs text-gray-400">{editing ? 'Modifica le quantità già registrate.' : 'Modifica la porzione intera della foto: la percentuale mangiata viene applicata dopo.'} Cambiando il peso, i valori si aggiornano in proporzione.</p>
        <div className="mt-4 space-y-3">
          {rows.map((row, index) => <div key={row.id} className="rounded-xl border border-gray-700 bg-gray-800/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-400">Ingrediente {index + 1}{row.assumed && <span className="ml-2 text-amber-300">· Ipotizzato</span>}</span>
              <button type="button" aria-label={`Rimuovi ${row.name || 'ingrediente'}`} onClick={() => setRows(current => current.filter(item => item.id !== row.id))}
                className="rounded-lg px-2 py-1 text-sm text-gray-400 hover:text-red-300">✕</button>
            </div>
            {row.note && <p className="mt-1 text-xs text-amber-200/80">{row.note}</p>}
            <label className="mt-2 block text-xs text-gray-400">Nome
              <input aria-label={`Nome ingrediente ${index + 1}`} value={row.name} maxLength={160} onChange={event => setRows(current => current.map(item => item.id === row.id
                ? { ...item, name: event.target.value, note: null } : item))} className={inputClass} />
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="min-w-0 text-xs text-gray-400">Quantità ({row.reference.unit ?? 'g'})
                <input aria-label={`Quantità ingrediente ${index + 1} (${row.reference.unit ?? 'g'})`} type="number" min="0.1" max="10000" step="any" inputMode="decimal" value={row.amount}
                  onChange={event => changeQuantity(row.id, event.target.value)} className={inputClass} />
              </label>
              <label className="min-w-0 text-xs text-gray-400">Categoria
                <select aria-label={`Categoria ingrediente ${index + 1}`} value={row.category} onChange={event => setRows(current => current.map(item => item.id === row.id
                  ? { ...item, category: event.target.value as FoodCategory } : item))} className={inputClass}>
                  {FOOD_CATEGORIES.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}
                </select>
              </label>
              {nutrientKeys.map(key => <label key={key} className="min-w-0 text-xs text-gray-400">{nutrientLabels[key]}
                <input aria-label={`${nutrientLabels[key]} ingrediente ${index + 1}`} type="number" min="0" step="any" inputMode="decimal" value={row.nutrients[key]}
                  onChange={event => changeNutrient(row.id, key, event.target.value)} className={inputClass} />
              </label>)}
            </div>
          </div>)}
        </div>
        <button type="button" onClick={() => setAdding(current => !current)} className="mt-4 w-full rounded-xl border border-gray-700 py-2.5 text-sm text-primary-300">
          {adding ? 'Chiudi ricerca' : '+ Aggiungi ingrediente'}
        </button>
        {adding && <div className="mt-3"><FoodSearch hideHeader onClose={() => setAdding(false)} onAdd={item => {
          const id = nextId.current++
          // Imported foods are snapshots, never linked to pantry or saved recipes.
          const detached: DishItemDraft = { ...item, food_key: null, pantry_item_id: null,
            dish_item_id: null, is_customization: false, piece_count: null, piece_size: null }
          setRows(current => [...current, createRow(detached, id)])
          setAdding(false)
        }} /></div>}
      </details>
    </fieldset>
    {error && <p role="alert" className="rounded-xl bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
    {!valid && <p className="text-xs text-amber-300">Completa nome, ingredienti e valori validi{!editing && ' e scegli una percentuale tra 1 e 100'}.</p>}
    <button type="button" onClick={() => void save()} disabled={!valid || saving}
      className="w-full rounded-xl bg-primary-600 py-3 font-semibold hover:bg-primary-500 disabled:opacity-40">
      {saving ? 'Salvataggio…' : editing ? 'Salva modifiche' : 'Registra nel diario'}
    </button>
    <button type="button" onClick={onCancel} disabled={saving} className="w-full py-2 text-sm text-gray-400 disabled:opacity-40">
      {editing ? 'Annulla' : '← Torna alla foto'}
    </button>
  </div>
}
