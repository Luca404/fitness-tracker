// src/components/meals/MacroBars.tsx

interface MacroBarProps {
  label: string
  value: number
  target: number
  color: string
}

function MacroBar({ label, value, target, color }: MacroBarProps) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span>{Math.round(value)}g / {target}g</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
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
    <div className="space-y-3">
      <MacroBar label="Proteine" value={protein} target={targets.protein_g} color="#10b981" />
      <MacroBar label="Carboidrati" value={carbs} target={targets.carbs_g} color="#3b82f6" />
      <MacroBar label="Grassi" value={fat} target={targets.fat_g} color="#f59e0b" />
    </div>
  )
}
