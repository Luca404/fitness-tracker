import { useRef, useState } from 'react'
import { BASIC_FOODS, type BasicFood } from '../../data/basicFoods'
import type { DishItemDraft } from '../../types'
import { scaleNutrition } from '../../utils/nutrition'
import { formatDecimal } from '../../utils/decimal'
import { validAlcoholStrength, withAlcoholStrength } from '../../utils/alcohol'
import AlcoholStrengthInput from './AlcoholStrengthInput'

const beverages = BASIC_FOODS.filter(food => ['beverage', 'alcohol'].includes(food.category) && food.id !== 'spritz')
function beverageIcon(food: BasicFood) {
  if (food.cocktail) return '🍸'
  if (food.id.startsWith('birra')) return '🍺'
  if (food.category === 'alcohol') return '🍷'
  if (food.id.includes('acqua')) return '💧'
  if (food.id === 'caffe-nero') return '☕'
  return '🥤'
}

export default function BeveragePicker({ onAddEntry }: {
  onAddEntry: (name: string, items: DishItemDraft[]) => Promise<void>
}) {
  const [selected, setSelected] = useState<BasicFood | null>(null)
  const [volume, setVolume] = useState(330)
  const [abv, setAbv] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const inProgress = useRef(false)
  const alcoholic = selected?.category === 'alcohol'
  const valid = selected && Number.isFinite(volume) && volume > 0 && (!alcoholic || validAlcoholStrength(abv))
  const draft: DishItemDraft | null = valid ? withAlcoholStrength({
    food_name: selected.name, quantity_g: volume, unit: 'ml',
    ...scaleNutrition(selected, volume / 100), alcohol_abv: selected.alcohol_abv ?? null,
    source: 'basic' as const, off_food_id: null, category: selected.category,
    food_key: `basic:${selected.id}`, pantry_item_id: null,
  }, alcoholic ? abv : null) : null
  async function save() {
    if (!draft || inProgress.current) return
    inProgress.current = true
    setSaving(true); setError(false)
    try { await onAddEntry(draft.food_name, [draft]); setSelected(null) }
    catch { setError(true) }
    finally { inProgress.current = false; setSaving(false) }
  }
  const matches = beverages.filter(food => [food.name, ...(food.aliases ?? [])].some(name => name.toLocaleLowerCase('it').includes(query.toLocaleLowerCase('it').trim())))
  return <div className="space-y-4">
    <div><p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Bevande</p><h3 className="mt-0.5 text-lg font-bold">Cosa hai bevuto?</h3></div>
    <input aria-label="Cerca bevanda" placeholder="Cerca bevanda o cocktail…" value={query}
      onChange={event => setQuery(event.target.value)} className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 outline-none focus:border-primary-500" />
    {selected && <div className="space-y-3 rounded-2xl border border-gray-700 bg-gray-900/30 p-4">
      <p className="font-semibold">{selected.name}</p>
      <label className="block text-xs text-gray-400">Quantità (ml)
        <input type="number" min={0.1} step="0.1" inputMode="decimal" value={volume || ''} disabled={saving}
          onChange={event => setVolume(Number(event.target.value))} onFocus={event => event.currentTarget.select()}
          className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-lg font-bold outline-none focus:border-primary-500" />
      </label>
      {alcoholic && <AlcoholStrengthInput value={abv} onChange={setAbv} volumeMl={volume} estimated={selected.cocktail} disabled={saving} />}
      {error && <p className="text-xs text-red-400">Impossibile registrare la bevanda. Riprova.</p>}
      <button type="button" onClick={() => void save()} disabled={!draft || saving}
        className="w-full rounded-xl bg-primary-500 py-3 font-semibold disabled:opacity-40">
        {saving ? 'Registrazione…' : `Registra ${formatDecimal(draft?.calories ?? 0)} kcal`}
      </button>
    </div>}
    {matches.length === 0 && <p className="text-sm text-gray-500">Nessuna bevanda trovata.</p>}
    {(['Analcoliche', 'Vino e birra', 'Cocktail'] as const).map((group, index) => {
      const foods = matches.filter(food => index === 0 ? food.category === 'beverage' : index === 1 ? food.category === 'alcohol' && !food.cocktail : food.cocktail)
      return foods.length > 0 && <section key={group} className="space-y-2"><h4 className="text-xs font-semibold text-gray-400">{group}</h4>
        <div className="grid grid-cols-2 gap-2">{foods.map(food => <button key={food.id} type="button" disabled={saving}
          onClick={() => { setSelected(food); setVolume(food.serving_ml ?? (food.id.includes('acqua') ? 500 : food.id === 'caffe-nero' ? 40 : 330)); setAbv(food.alcohol_abv ?? null); setError(false) }}
          className={`rounded-xl border px-3 py-3 text-left text-xs disabled:opacity-40 ${selected?.id === food.id ? 'border-primary-500 bg-primary-950/30' : 'border-gray-700 bg-gray-800/60'}`}>
          <span aria-hidden="true" className="mr-2 text-lg">{beverageIcon(food)}</span>{food.name}</button>)}</div></section>
    })}
  </div>
}
