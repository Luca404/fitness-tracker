import type { Sex } from '../../types'

interface PhysicalData {
  age: number
  sex: Sex
  height_cm: number
  weight_kg: number
  body_fat_pct: number | null
}

interface Props {
  data: PhysicalData
  onChange: (d: PhysicalData) => void
  onNext: () => void
}

export default function StepPhysical({ data, onChange, onNext }: Props) {
  function set<K extends keyof PhysicalData>(key: K, value: PhysicalData[K]) {
    onChange({ ...data, [key]: value })
  }

  const valid = data.age > 0 && data.height_cm > 0 && data.weight_kg > 0

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Dati fisici</h2>

      <div className="flex gap-3">
        {(['male', 'female'] as Sex[]).map(s => (
          <button
            key={s}
            onClick={() => set('sex', s)}
            className={`flex-1 py-3 rounded-lg border-2 font-medium transition-colors ${
              data.sex === s ? 'border-emerald-500 text-emerald-400' : 'border-gray-600 text-gray-400'
            }`}
          >
            {s === 'male' ? '♂ Maschio' : '♀ Femmina'}
          </button>
        ))}
      </div>

      {[
        { label: 'Età (anni)', key: 'age' as const, min: 10, max: 100 },
        { label: 'Altezza (cm)', key: 'height_cm' as const, min: 100, max: 250 },
        { label: 'Peso (kg)', key: 'weight_kg' as const, min: 30, max: 300 },
      ].map(({ label, key, min, max }) => (
        <div key={key}>
          <label className="text-sm text-gray-400 mb-1 block">{label}</label>
          <input
            type="number"
            min={min}
            max={max}
            value={data[key] || ''}
            onChange={e => set(key, parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-emerald-500 outline-none"
          />
        </div>
      ))}

      <div>
        <label className="text-sm text-gray-400 mb-1 block">% Grasso corporeo (opzionale)</label>
        <input
          type="number"
          min={3}
          max={60}
          value={data.body_fat_pct ?? ''}
          onChange={e => set('body_fat_pct', e.target.value ? parseFloat(e.target.value) : null)}
          className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-emerald-500 outline-none"
        />
      </div>

      <button
        onClick={onNext}
        disabled={!valid}
        className="w-full py-4 rounded-xl bg-emerald-500 font-semibold text-lg disabled:opacity-40"
      >
        Continua →
      </button>
    </div>
  )
}
