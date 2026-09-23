import type { Objective } from '../../types'
import { RECOMPOSITION_TRAINING_ADVICE } from '../../config/nutritionGoals'

interface Props {
  objective: Objective
  value: boolean | null
  onChange: (value: boolean) => void
  onNext: () => void
  onBack: () => void
}

export default function StepTraining({ objective, value, onChange, onNext, onBack }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Allenamento di forza</h2>
        <p className="mt-2 text-sm text-gray-400">
          Pratichi regolarmente allenamento di forza o con i pesi?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { answer: true, label: 'Sì', detail: 'Con regolarità' },
          { answer: false, label: 'No', detail: 'O solo occasionalmente' },
        ].map(({ answer, label, detail }) => (
          <button
            key={label}
            type="button"
            onClick={() => onChange(answer)}
            className={`rounded-xl border-2 p-4 text-left transition-colors ${
              value === answer
                ? 'border-primary-500 bg-primary-600/10'
                : 'border-gray-700 bg-gray-800'
            }`}
          >
            <span className="font-semibold">{label}</span>
            <p className="mt-1 text-xs text-gray-400">{detail}</p>
          </button>
        ))}
      </div>

      <p className="rounded-xl bg-gray-800 p-3 text-xs text-gray-400">
        Questa risposta è separata dal livello di attività e serve soprattutto a stimare il fabbisogno proteico.
      </p>
      {objective === 'recomposition' && value === false && (
        <p className="rounded-xl bg-orange-400/10 p-3 text-sm text-orange-300">⚠️ {RECOMPOSITION_TRAINING_ADVICE}</p>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 rounded-xl border border-gray-600 py-4 text-gray-400">
          ← Indietro
        </button>
        <button
          onClick={onNext}
          disabled={value === null}
          className="flex-1 rounded-xl bg-primary-600 py-4 font-semibold disabled:opacity-40"
        >
          Continua →
        </button>
      </div>
    </div>
  )
}
