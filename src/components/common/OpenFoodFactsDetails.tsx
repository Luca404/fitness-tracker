import type { FoodResult } from '../../types'

interface Props {
  food: Partial<Pick<FoodResult,
    'brand' | 'quantity' | 'serving_size' | 'image_url' | 'calories_100g' | 'protein_100g' | 'carbs_100g' | 'fat_100g' |
    'fiber_100g' | 'sugars_100g' | 'saturated_fat_100g' | 'unsaturated_fat_100g' | 'salt_100g' |
    'nutrition_score' | 'nutrition_grade' | 'nova_group' | 'ecoscore_grade' |
    'ingredients' | 'allergens' | 'traces' | 'labels' | 'categories'
  >>
}

function Nutrient({ label, value }: { label: string; value: number | null | undefined }) {
  if (value === null || value === undefined) return null
  return <span className="rounded-lg bg-black/10 px-2 py-1">{label} <b>{value} g</b></span>
}

export default function OpenFoodFactsDetails({ food }: Props) {
  const hasNutrition = [
    food.fiber_100g, food.sugars_100g, food.saturated_fat_100g,
    food.unsaturated_fat_100g, food.salt_100g,
  ].some(value => value !== null && value !== undefined)
  const hasScores = food.nutrition_grade || food.nutrition_score !== null && food.nutrition_score !== undefined
    || food.nova_group !== null && food.nova_group !== undefined || food.ecoscore_grade

  return (
    <div className="space-y-2 rounded-xl bg-black/10 p-3 text-xs text-gray-400">
      {food.image_url && <img src={food.image_url} alt="" className="h-24 w-24 rounded-lg object-contain bg-white" />}
      {(food.brand || food.quantity || food.serving_size) && (
        <p>
          {food.brand && `Marca: ${food.brand}`}
          {food.quantity && ` · ${food.quantity}`}
          {food.serving_size && ` · Porzione: ${food.serving_size}`}
        </p>
      )}
      {(food.calories_100g !== undefined || food.protein_100g !== undefined || food.carbs_100g !== undefined || food.fat_100g !== undefined) && (
        <div className="flex flex-wrap gap-1.5">
          {food.calories_100g !== undefined && <span className="rounded-lg bg-black/10 px-2 py-1"><b>{food.calories_100g} kcal</b></span>}
          {food.protein_100g !== undefined && <Nutrient label="Proteine" value={food.protein_100g} />}
          {food.carbs_100g !== undefined && <Nutrient label="Carboidrati" value={food.carbs_100g} />}
          {food.fat_100g !== undefined && <Nutrient label="Grassi" value={food.fat_100g} />}
        </div>
      )}
      {hasNutrition && (
        <div className="flex flex-wrap gap-1.5">
          <Nutrient label="Fibre" value={food.fiber_100g} />
          <Nutrient label="Zuccheri" value={food.sugars_100g} />
          <Nutrient label="Saturi" value={food.saturated_fat_100g} />
          <Nutrient label="Insaturi" value={food.unsaturated_fat_100g} />
          <Nutrient label="Sale" value={food.salt_100g} />
        </div>
      )}
      {hasScores && (
        <div className="flex flex-wrap gap-2 text-[11px]">
          {food.nutrition_grade && <span>Nutri-Score <b>{food.nutrition_grade.toUpperCase()}</b></span>}
          {food.nutrition_score !== null && food.nutrition_score !== undefined && <span>Punteggio <b>{food.nutrition_score}</b></span>}
          {food.nova_group !== null && food.nova_group !== undefined && <span>NOVA <b>{food.nova_group}</b></span>}
          {food.ecoscore_grade && <span>Eco-Score <b>{food.ecoscore_grade.toUpperCase()}</b></span>}
        </div>
      )}
      {food.ingredients && <p><span className="text-gray-300">Ingredienti:</span> {food.ingredients}</p>}
      {food.allergens && <p><span className="text-gray-300">Allergeni:</span> {food.allergens}</p>}
      {food.traces && <p><span className="text-gray-300">Tracce:</span> {food.traces}</p>}
      {food.labels && food.labels.length > 0 && <p><span className="text-gray-300">Etichette:</span> {food.labels.join(', ')}</p>}
      {food.categories && food.categories.length > 0 && <p><span className="text-gray-300">Categorie:</span> {food.categories.join(', ')}</p>}
    </div>
  )
}
