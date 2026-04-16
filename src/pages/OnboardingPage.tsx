import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import StepPhysical from '../components/onboarding/StepPhysical'
import StepObjective from '../components/onboarding/StepObjective'
import StepLifestyle from '../components/onboarding/StepLifestyle'
import StepConfirm from '../components/onboarding/StepConfirm'
import type { Sex, ActivityLevel, Objective, SuggestedGoals } from '../types'

const TOTAL_STEPS = 4

export default function OnboardingPage() {
  const { user } = useAuth()
  const { saveProfile, saveGoals, showToast } = useData()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)

  const [physical, setPhysical] = useState({
    age: 0, sex: 'male' as Sex, height_cm: 0, weight_kg: 0, body_fat_pct: null as number | null,
  })
  const [objective, setObjective] = useState({
    objective: 'maintain' as Objective,
    target_weight_kg: null as number | null,
    target_date: null as string | null,
  })
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate')

  async function handleConfirm(goals: SuggestedGoals) {
    if (!user) return
    try {
      await saveProfile({
        user_id: user.id,
        ...physical,
        activity_level: activityLevel,
        ...objective,
        bmr_override: null,
      })
      await saveGoals({ user_id: user.id, ...goals })
      navigate('/meals')
    } catch {
      showToast('Errore salvataggio profilo')
    }
  }

  const profileForConfirm = {
    ...physical,
    activity_level: activityLevel,
    ...objective,
    bmr_override: null,
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-md mx-auto">
        {/* Progress bar */}
        <div className="flex gap-1 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < step ? 'bg-emerald-500' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <StepPhysical
            data={physical}
            onChange={setPhysical}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <StepObjective
            data={objective}
            currentWeightKg={physical.weight_kg}
            onChange={setObjective}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepLifestyle
            value={activityLevel}
            onChange={setActivityLevel}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <StepConfirm
            profile={profileForConfirm}
            onConfirm={handleConfirm}
            onBack={() => setStep(3)}
          />
        )}

        <button
          onClick={() => navigate('/meals')}
          className="mt-6 w-full text-center text-gray-500 text-sm"
        >
          Salta per ora
        </button>
      </div>
    </div>
  )
}
