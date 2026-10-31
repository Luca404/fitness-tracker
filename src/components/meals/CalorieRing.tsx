// src/components/meals/CalorieRing.tsx
import { formatDecimal } from '../../utils/decimal'

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
    <div className="calorie-ring" role="img" aria-label={`${formatDecimal(consumed, 0)} kcal consumate su ${formatDecimal(target, 0)} kcal di obiettivo`}>
      <svg viewBox="0 0 148 148" className="-rotate-90" aria-hidden="true">
        <circle cx={74} cy={74} r={r} fill="none" stroke="#343c34" strokeWidth={10} />
        <circle
          cx={74} cy={74} r={r} fill="none"
          stroke={over ? '#c79278' : '#d4e6a3'}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="calorie-value">{formatDecimal(consumed, 0)}</span>
        <span className="calorie-target">/ {formatDecimal(target, 0)} kcal</span>
      </div>
    </div>
  )
}
