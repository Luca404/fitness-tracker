import type { ActivityLevel } from '../../types'

const LEVELS: { key: ActivityLevel; label: string; desc: string }[] = [
  { key: 'sedentary',  label: 'Sedentario',     desc: 'Lavoro da scrivania, poco o nessun esercizio' },
  { key: 'light',      label: 'Leggero',         desc: '1-3 allenamenti a settimana' },
  { key: 'moderate',   label: 'Moderato',        desc: '3-5 allenamenti a settimana' },
  { key: 'active',     label: 'Attivo',          desc: '6-7 allenamenti a settimana' },
  { key: 'very_active',label: 'Molto attivo',    desc: 'Lavoro fisico + allenamenti giornalieri' },
]

interface Props {
  value: ActivityLevel
  onChange: (v: ActivityLevel) => void
  onNext: () => void
  onBack: () => void
}

export default function StepLifestyle({ value, onChange, onNext, onBack }: Props) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Stile di vita</h2>
      <div className="space-y-2">
        {LEVELS.map(({ key, label, desc }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`w-full p-4 rounded-xl border-2 text-left transition-colors ${
              value === key
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-gray-700 bg-gray-800'
            }`}
          >
            <span className="font-semibold">{label}</span>
            <p className="text-sm text-gray-400 mt-0.5">{desc}</p>
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-4 rounded-xl border border-gray-600 text-gray-400">
          ← Indietro
        </button>
        <button onClick={onNext} className="flex-1 py-4 rounded-xl bg-emerald-500 font-semibold">
          Continua →
        </button>
      </div>
    </div>
  )
}
