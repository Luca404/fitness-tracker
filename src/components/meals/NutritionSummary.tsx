import type { DaySummary, UserGoals } from '../../types'
import { formatDecimal } from '../../utils/decimal'
import CalorieRing from './CalorieRing'
import MacroBars from './MacroBars'

export default function NutritionSummary({ summary, goals }: { summary: DaySummary; goals: UserGoals | null }) {
  const target = goals?.calorie_target ?? 2000
  // Workouts are informational: the target already includes daily activity.
  const remaining = target - summary.calories
  return <section className="nutrition-summary" aria-label="Riepilogo nutrizionale">
    <div className="energy-summary">
      <h2 className="section-title">Energia di oggi</h2>
      <div className="energy-content">
        <CalorieRing consumed={summary.calories} target={target} />
        <dl className="energy-stats">
          <div><dt>Consumate</dt><dd>{formatDecimal(summary.calories, 0)} kcal</dd></div>
          <div><dt>Obiettivo</dt><dd>{formatDecimal(target, 0)} kcal</dd></div>
          {summary.calories_burned > 0 && <div><dt>Bruciate</dt><dd className="text-orange-400">{formatDecimal(summary.calories_burned, 0)} kcal</dd></div>}
          <div><dt>Rimanenti</dt><dd className={remaining < 0 ? 'text-orange-400' : 'text-primary-400'}>{remaining < 0 ? '+' : ''}{formatDecimal(Math.abs(remaining), 0)} kcal</dd></div>
        </dl>
      </div>
    </div>
    {goals && <div className="macro-summary">
      <h2 className="section-title">Macronutrienti</h2>
      <MacroBars protein={summary.protein_g} carbs={summary.carbs_g} fat={summary.fat_g} targets={goals} />
    </div>}
  </section>
}
