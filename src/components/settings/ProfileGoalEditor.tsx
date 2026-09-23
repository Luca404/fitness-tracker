import { useState } from 'react'
import type { ActivityLevel, Objective, Sex, UserHealthProfile } from '../../types'
import { RECOMPOSITION_TRAINING_ADVICE } from '../../config/nutritionGoals'

const ACTIVITY_LEVELS: Array<{ value: ActivityLevel; label: string }> = [
  { value: 'sedentary', label: 'Sedentario' },
  { value: 'light', label: 'Leggero' },
  { value: 'moderate', label: 'Moderato' },
  { value: 'active', label: 'Attivo' },
  { value: 'very_active', label: 'Molto attivo' },
]

const OBJECTIVES: Array<{ value: Objective; label: string }> = [
  { value: 'lose_weight', label: 'Perdere peso' },
  { value: 'maintain', label: 'Mantenere il peso' },
  { value: 'gain_muscle', label: 'Aumentare massa' },
  { value: 'recomposition', label: 'Ricomposizione corporea – ridurre grasso e aumentare massa muscolare' },
]

interface Props {
  profile: UserHealthProfile
  currentWeightKg: number
  onSave: (profile: UserHealthProfile) => Promise<void>
  onClose: () => void
}

export default function ProfileGoalEditor({ profile, currentWeightKg, onSave, onClose }: Props) {
  const [draft, setDraft] = useState(profile)
  const [saving, setSaving] = useState(false)

  function set<K extends keyof UserHealthProfile>(key: K, value: UserHealthProfile[K]) {
    setDraft(previous => ({ ...previous, [key]: value }))
  }

  function setObjective(objective: Objective) {
    setDraft(previous => ({
      ...previous,
      objective,
      target_weight_kg: objective === 'maintain' || objective === 'recomposition' ? null : previous.target_weight_kg,
      target_date: objective === 'lose_weight' ? previous.target_date : null,
    }))
  }

  const validPhysicalData = draft.age >= 10 && draft.age <= 120
    && draft.height_cm >= 100 && draft.height_cm <= 250
    && (draft.body_fat_pct === null || (draft.body_fat_pct >= 1 && draft.body_fat_pct <= 75))
  const today = new Date().toLocaleDateString('sv-SE')
  const validObjective = draft.objective !== 'lose_weight'
    || (draft.target_weight_kg !== null
      && draft.target_weight_kg < currentWeightKg
      && !!draft.target_date
      && draft.target_date >= today)
  const valid = validPhysicalData && validObjective

  async function handleSave() {
    if (!valid || saving) return
    setSaving(true)
    try {
      await onSave(draft)
      onClose()
    } catch {
      // The parent reports the persistence error and the editor stays open.
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-gray-900/50 p-3 text-xs text-gray-400">
        Il salvataggio ricalcola BMR, TDEE, calorie e tutti i macro usando il peso di riferimento corrente.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {([{ value: 'male', label: 'Maschio' }, { value: 'female', label: 'Femmina' }] as Array<{ value: Sex; label: string }>).map(option => (
          <button key={option.value} type="button" onClick={() => set('sex', option.value)}
            className={`rounded-xl border px-3 py-2.5 text-sm ${draft.sex === option.value ? 'border-primary-500 bg-primary-600/10 text-primary-300' : 'border-gray-600 text-gray-400'}`}>
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-gray-400">Età</span>
          <input type="number" min={10} max={120} value={draft.age || ''}
            onChange={event => set('age', Number(event.target.value))} className="input-field" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-gray-400">Altezza (cm)</span>
          <input type="number" min={100} max={250} value={draft.height_cm || ''}
            onChange={event => set('height_cm', Number(event.target.value))} className="input-field" />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs text-gray-400">Grasso corporeo % (facoltativo)</span>
        <input type="number" min={1} max={75} step={0.1} value={draft.body_fat_pct ?? ''}
          onChange={event => set('body_fat_pct', event.target.value ? Number(event.target.value) : null)} className="input-field" />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-gray-400">Livello di attività</span>
        <select value={draft.activity_level} onChange={event => set('activity_level', event.target.value as ActivityLevel)} className="input-field">
          {ACTIVITY_LEVELS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>

      <div>
        <p className="mb-2 text-xs text-gray-400">Allenamento regolare di forza/pesi</p>
        <div className="grid grid-cols-2 gap-3">
          {[{ value: true, label: 'Sì' }, { value: false, label: 'No' }].map(option => (
            <button key={option.label} type="button" onClick={() => set('does_resistance_training', option.value)}
              className={`rounded-xl border px-3 py-2.5 text-sm ${draft.does_resistance_training === option.value ? 'border-primary-500 bg-primary-600/10 text-primary-300' : 'border-gray-600 text-gray-400'}`}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs text-gray-400">Obiettivo</span>
        <select value={draft.objective} onChange={event => setObjective(event.target.value as Objective)} className="input-field">
          {OBJECTIVES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>

      {draft.objective === 'recomposition' && !draft.does_resistance_training && (
        <p className="rounded-xl bg-orange-400/10 p-3 text-sm text-orange-300">⚠️ {RECOMPOSITION_TRAINING_ADVICE}</p>
      )}

      {draft.objective !== 'maintain' && draft.objective !== 'recomposition' && (
        <label className="block">
          <span className="mb-1 block text-xs text-gray-400">
            Peso obiettivo (kg){draft.objective === 'gain_muscle' ? ' — facoltativo' : ''}
          </span>
          <input type="number" min={20} max={400} step={0.1} value={draft.target_weight_kg ?? ''}
            onChange={event => set('target_weight_kg', event.target.value ? Number(event.target.value) : null)} className="input-field" />
          {draft.objective === 'lose_weight' && draft.target_weight_kg !== null && draft.target_weight_kg >= currentWeightKg && (
            <span className="mt-1 block text-xs text-orange-400">Deve essere inferiore al peso corrente.</span>
          )}
        </label>
      )}

      {draft.objective === 'lose_weight' && (
        <label className="block">
          <span className="mb-1 block text-xs text-gray-400">Data obiettivo</span>
          <input type="date" min={today} value={draft.target_date ?? ''}
            onChange={event => set('target_date', event.target.value || null)} className="input-field" />
          {draft.target_date && draft.target_date < today && (
            <span className="mt-1 block text-xs text-orange-400">La data deve essere oggi o successiva.</span>
          )}
        </label>
      )}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-600 py-3 text-gray-300">Annulla</button>
        <button type="button" onClick={handleSave} disabled={!valid || saving} className="btn-primary flex-1 py-3 disabled:opacity-40">
          {saving ? 'Salvataggio...' : 'Salva e ricalcola'}
        </button>
      </div>
    </div>
  )
}
