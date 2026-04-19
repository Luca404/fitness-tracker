import { MET_ACTIVITIES } from '../../utils/met'

interface Props {
  onSelect: (activityKey: string) => void
}

export default function ActivityGrid({ onSelect }: Props) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {Object.entries(MET_ACTIVITIES).map(([key, { label, icon }]) => (
        <button
          key={key}
          type="button"
          onClick={() => onSelect(key)}
          className="flex flex-col items-center p-3 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors"
        >
          <span className="text-2xl mb-1" aria-hidden="true">{icon}</span>
          <span className="text-xs text-gray-300 text-center leading-tight">{label}</span>
        </button>
      ))}
    </div>
  )
}
