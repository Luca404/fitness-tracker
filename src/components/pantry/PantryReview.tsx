import AlcoholStrengthInput from '../meals/AlcoholStrengthInput'
import { validAlcoholStrength } from '../../utils/alcohol'
import OpenFoodFactsDetails from '../common/OpenFoodFactsDetails'
import { FOOD_CATEGORIES, FOOD_CATEGORY_BY_ID } from '../../data/foodCategories'
import { normalizeBarcode } from '../../services/barcodeProducts'
import type { FoodCategory } from '../../types'
import type { PendingFood } from '../../utils/pantryDraft'
import { formatDecimal, roundToTwo } from '../../utils/decimal'
import { PendingNutritionFields } from './PantryNutritionFields'

export default function PantryReview({ pending, setPending, editingItemId, analysisReviewAcknowledged,
  setAnalysisReviewAcknowledged, savingItem, handleAddToPantry, resetAddFlow }: {
  pending: PendingFood
  setPending: (food: PendingFood) => void
  editingItemId: string | null
  analysisReviewAcknowledged: boolean
  setAnalysisReviewAcknowledged: (value: boolean) => void
  savingItem: boolean
  handleAddToPantry: () => Promise<void>
  resetAddFlow: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gray-800 p-4">
        <p className="text-xs text-gray-500">{FOOD_CATEGORY_BY_ID[pending.category]?.icon ?? FOOD_CATEGORY_BY_ID.other.icon} {FOOD_CATEGORY_BY_ID[pending.category]?.label ?? FOOD_CATEGORY_BY_ID.other.label}</p>
        <label className="mt-2 block text-sm text-gray-400" htmlFor="pending-food-name">Nome alimento</label>
        <input
          id="pending-food-name"
          value={pending.name}
          onChange={event => setPending({ ...pending, name: event.target.value })}
          className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 outline-none focus:border-primary-500"
        />
        {pending.off_data && pending.source !== 'ai_photo' && <div className="mt-3"><OpenFoodFactsDetails food={pending} /></div>}
      </div>
      {pending.source === 'ai_photo' && (
        <div className="space-y-4 rounded-2xl border border-primary-900/70 bg-primary-950/15 p-4">
          <div>
            <p className="text-sm font-semibold text-primary-300">Controlla i dati letti dalla foto</p>
            <p className="mt-1 text-xs text-gray-400">
              L’AI può sbagliare: confronta soprattutto calorie e valori per 100 {pending.nutrition_basis === 'per_100ml' ? 'ml' : 'g'} con l’etichetta.
            </p>
          </div>
          {pending.analysis_requires_review && (
            <div className="rounded-xl border border-red-800/70 bg-red-950/30 p-3 text-xs text-red-200">
              <p className="font-semibold">Controlli automatici non superati</p>
              <p className="mt-1">Correggi i campi confrontandoli con l’etichetta, poi conferma la revisione.</p>
              {pending.analysis_validation_errors && pending.analysis_validation_errors.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {pending.analysis_validation_errors.map((error, index) => <li key={`${error}-${index}`}>• {error}</li>)}
                </ul>
              )}
            </div>
          )}
          {pending.analysis_warnings && pending.analysis_warnings.length > 0 && (
            <ul className="space-y-1 rounded-xl bg-orange-950/30 p-3 text-xs text-orange-300">
              {pending.analysis_warnings.map((warning, index) => <li key={`${warning}-${index}`}>• {warning}</li>)}
            </ul>
          )}
          <div>
            <label className="text-sm text-gray-400" htmlFor="pending-brand">Marca</label>
            <input id="pending-brand" value={pending.brand ?? ''}
              onChange={event => setPending({ ...pending, brand: event.target.value || null })}
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 outline-none focus:border-primary-500" />
          </div>
          <div>
            <label className="text-sm text-gray-400" htmlFor="pending-package-label">Confezione indicata</label>
            <input id="pending-package-label" value={pending.quantity ?? ''}
              onChange={event => setPending({ ...pending, quantity: event.target.value || null })}
              placeholder="es. 10 uova oppure 500 g"
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 outline-none focus:border-primary-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-gray-400">
              Pezzi per confezione
              <input type="number" min={1} step={1} value={pending.package_piece_count ?? ''}
                onChange={event => {
                  const value = event.target.value ? Math.max(1, Math.round(Number(event.target.value))) : null
                  setPending({ ...pending, package_piece_count: value })
                }}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm outline-none focus:border-primary-500" />
            </label>
            <label className="text-xs text-gray-400">
              Peso/volume netto
              <input type="number" min={0} step="0.1" value={pending.package_net_quantity_value == null ? '' : formatDecimal(pending.package_net_quantity_value)}
                onChange={event => {
                  const value = event.target.value ? Math.max(0, roundToTwo(Number(event.target.value))) : null
                  setPending({ ...pending, package_net_quantity_value: value })
                }}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm outline-none focus:border-primary-500" />
            </label>
          </div>
          <div>
            <label className="text-xs text-gray-400" htmlFor="pending-net-unit">Unità peso/volume netto</label>
            <select id="pending-net-unit" value={pending.package_net_quantity_unit ?? ''}
              onChange={event => {
                const value = event.target.value === 'g' || event.target.value === 'ml' ? event.target.value : null
                setPending({ ...pending, package_net_quantity_unit: value })
              }}
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 outline-none focus:border-primary-500">
              <option value="">Non indicata</option>
              <option value="g">grammi</option>
              <option value="ml">millilitri</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400" htmlFor="pending-serving">Porzione indicata</label>
            <input id="pending-serving" value={pending.serving_size ?? ''}
              onChange={event => setPending({ ...pending, serving_size: event.target.value || null })}
              placeholder="es. 30 g"
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 outline-none focus:border-primary-500" />
          </div>
          <div>
            <label className="text-sm text-gray-400" htmlFor="pending-ingredients">Ingredienti</label>
            <textarea id="pending-ingredients" value={pending.ingredients ?? ''} rows={3}
              onChange={event => setPending({ ...pending, ingredients: event.target.value || null })}
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 outline-none focus:border-primary-500" />
          </div>
          <div>
            <label className="text-sm text-gray-400" htmlFor="pending-allergens">Allergeni</label>
            <input id="pending-allergens" value={pending.allergens ?? ''}
              onChange={event => setPending({ ...pending, allergens: event.target.value || null })}
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 outline-none focus:border-primary-500" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Valori nutrizionali per 100 {pending.nutrition_basis === 'per_100ml' ? 'ml' : 'g'}</p>
            <PendingNutritionFields food={pending}
              onChange={(key, value) => setPending({ ...pending, [key]: value === null ? null : Math.max(0, value) })} />
          </div>
          {pending.analysis_requires_review && (
            <label className="flex items-start gap-2 rounded-xl border border-gray-700 bg-gray-900/50 p-3 text-xs text-gray-300">
              <input type="checkbox" checked={analysisReviewAcknowledged}
                onChange={event => setAnalysisReviewAcknowledged(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary-500" />
              Ho confrontato e corretto i valori segnalati usando la confezione.
            </label>
          )}
        </div>
      )}
      {editingItemId && pending.source !== 'ai_photo' && (
        <div className="rounded-2xl bg-gray-800 p-4">
          <p className="text-sm text-gray-400">Valori nutrizionali per 100 {pending.nutrition_basis === 'per_100ml' ? 'ml' : 'g'}</p>
          <PendingNutritionFields food={pending}
            onChange={(key, value) => setPending({ ...pending, [key]: value })} />
        </div>
      )}
      <div>
        <label className="text-sm text-gray-400" htmlFor="pending-barcode">Codice a barre</label>
        <input
          id="pending-barcode"
          inputMode="numeric"
          value={pending.barcode ?? ''}
          onChange={event => setPending({ ...pending, barcode: event.target.value || null })}
          placeholder="EAN / UPC (facoltativo)"
          className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 outline-none focus:border-primary-500"
        />
        {pending.barcode && !normalizeBarcode(pending.barcode) && (
          <p className="mt-1 text-xs text-orange-400">Inserisci un codice numerico di 8, 12, 13 o 14 cifre.</p>
        )}
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
      {pending.category === 'alcohol' && <AlcoholStrengthInput value={pending.alcohol_abv ?? null}
        onChange={value => setPending({ ...pending, alcohol_abv: value })} disabled={savingItem} />}
      <button type="button" onClick={handleAddToPantry}
        disabled={savingItem
          || (pending.alcohol_abv != null && !validAlcoholStrength(pending.alcohol_abv))
          || !pending.name.trim()
          || Boolean(pending.barcode && !normalizeBarcode(pending.barcode))
          || Boolean(pending.analysis_requires_review && !analysisReviewAcknowledged)}
        className="w-full py-3 bg-primary-600 rounded-lg font-semibold disabled:opacity-40">
        {savingItem ? 'Salvataggio…' : editingItemId ? 'Salva modifiche' : 'Salva ingrediente'}
      </button>
      <button type="button" onClick={resetAddFlow} disabled={savingItem}
        className="text-sm text-gray-500 text-center w-full disabled:opacity-40">
        Annulla
      </button>
    </div>
  )
}
