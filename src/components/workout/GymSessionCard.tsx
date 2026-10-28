import type { GymSession, WeightLog } from '../../types'
import { formatDecimal } from '../../utils/decimal'
import { estimateGymSessionCalories, formatGymDuration, sessionDurationMinutes, weightForSessionDate } from '../../utils/gymSessionSummary'

export default function GymSessionCard({ session, weightLogs, fallbackWeightKg, showDate, onOpen }: {
  session: GymSession
  weightLogs: WeightLog[]
  fallbackWeightKg: number | null
  showDate?: boolean
  onOpen: () => void
}) {
  const duration = sessionDurationMinutes(session)
  const bodyWeightKg = weightForSessionDate(session.date, weightLogs, fallbackWeightKg)
  const calories = estimateGymSessionCalories(session, bodyWeightKg)

  return <button type="button" onClick={onOpen}
    className="w-full rounded-2xl border border-gray-700 bg-gray-800/70 p-4 text-left transition hover:border-primary-700">
    <div className="flex items-start justify-between gap-3">
      <span className="font-semibold">{session.plan_name}{showDate && <span className="ml-2 text-xs font-normal text-gray-400">{new Date(`${session.date}T00:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}</span>
      <span className="shrink-0 text-primary-400" aria-hidden="true">›</span>
    </div>
    <p className="mt-1 text-xs text-gray-400">{session.sets.filter(set => set.done).length} serie completate</p>
    <div className="mt-3 grid grid-cols-2 gap-2">
      <span className="rounded-xl bg-gray-900/70 px-3 py-2">
        <span className="block text-xs text-gray-400">⏱ Durata totale</span>
        <span className="mt-0.5 block font-semibold text-white">{duration === null ? 'Non disponibile' : formatGymDuration(duration)}</span>
      </span>
      <span className="rounded-xl bg-gray-900/70 px-3 py-2">
        <span className="block text-xs text-gray-400">🔥 Calorie stimate</span>
        <span className="mt-0.5 block font-semibold text-orange-400">{calories === null ? 'Non disponibili' : `≈ ${calories} kcal`}</span>
      </span>
    </div>
    <p className="mt-2 text-xs text-gray-500">{calories !== null && bodyWeightKg !== null
      ? `Da esercizi, carichi e peso corporeo usato nella stima (${formatDecimal(bodyWeightKg)} kg).`
      : bodyWeightKg === null ? 'Serve un peso corporeo registrato per stimare le calorie.'
        : 'Durata non disponibile per la stima delle calorie.'}</p>
  </button>
}

