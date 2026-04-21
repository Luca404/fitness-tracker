// src/components/meals/CalorieRing.tsx

interface Props {
  consumed: number
  target: number
}

export default function CalorieRing({ consumed, target }: Props) {
  const r = 60
  const circumference = 2 * Math.PI * r
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0
  const strokeDashoffset = circumference * (1 - pct)
  const over = consumed > target

  return (
    <div className="relative" style={{ width: 148, height: 148 }}>
      <svg width={148} height={148} className="-rotate-90">
        <circle cx={74} cy={74} r={r} fill="none" stroke="#374151" strokeWidth={12} />
        <circle
          cx={74} cy={74} r={r} fill="none"
          stroke={over ? '#f97316' : '#10b981'}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{Math.round(consumed)}</span>
        <span className="text-gray-400 text-sm">/ {target} kcal</span>
      </div>
    </div>
  )
}
