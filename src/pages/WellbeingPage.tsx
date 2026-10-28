import DaySelector from '../components/common/DaySelector'
import GoodHabits from '../components/meals/GoodHabits'
import { useData } from '../contexts/DataContext'
import { useSettings } from '../contexts/SettingsContext'
import { Link } from 'react-router-dom'

export default function WellbeingPage() {
  const { meals, loading } = useData()
  const { selectedDate, setSelectedDate } = useSettings()

  return (
    <div className="space-y-5 p-4 pb-24">
      <Link to="/meals" className="inline-block py-2 text-sm text-primary-400">← Pasti</Link>
      <DaySelector date={selectedDate} onChange={setSelectedDate} />
      {loading ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-gray-800" />
          ))}
        </div>
      ) : (
        <GoodHabits selectedDate={selectedDate} currentMeals={meals} />
      )}
    </div>
  )
}
