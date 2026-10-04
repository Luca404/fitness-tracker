import DaySelector from '../components/common/DaySelector'
import GoodHabits from '../components/meals/GoodHabits'
import { useData } from '../contexts/DataContext'
import { useSettings } from '../contexts/SettingsContext'

export default function WellbeingPage() {
  const { meals, loading } = useData()
  const { selectedDate, setSelectedDate } = useSettings()

  return (
    <div className="space-y-5 p-4 pb-24">
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
