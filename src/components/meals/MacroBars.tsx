// src/components/meals/MacroBars.tsx
import { formatDecimal } from '../../utils/decimal'

interface MacroBarProps {
  label: string
  value: number
  target: number
  color: string
}

function MacroBar({ label, value, target, color }: MacroBarProps) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0
  return (
    <div className="macro-row">
      <div className="macro-labels">
        <span className="text-gray-400">{label}</span>
        <span>{formatDecimal(value, 0)}g / {formatDecimal(target, 0)}g</span>
      </div>
      <div className="macro-track" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={Math.max(Math.round(target), Math.round(value))} aria-valuetext={`${formatDecimal(value)} g su ${formatDecimal(target)} g`}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

interface Props {
  protein: number
  carbs: number
  fat: number
  targets: { protein_g: number; carbs_g: number; fat_g: number }
}

export default function MacroBars({ protein, carbs, fat, targets }: Props) {
  return (
    <div className="macro-bars">
      <MacroBar label="Proteine" value={protein} target={targets.protein_g} color="#d4e6a3" />
      <MacroBar label="Carboidrati" value={carbs} target={targets.carbs_g} color="#c79278" />
      <MacroBar label="Grassi" value={fat} target={targets.fat_g} color="#d5bd75" />
    </div>
  )
}
