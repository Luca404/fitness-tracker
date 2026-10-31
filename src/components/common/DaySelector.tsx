import { format, addDays, subDays, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import Icon from './Icon'

interface Props { date: string; onChange: (date: string) => void }

export default function DaySelector({ date, onChange }: Props) {
  const parsed = parseISO(date)
  const weekday = format(parsed, 'EEEE', { locale: it })
  return <div className="day-selector" aria-label="Data del diario">
    <button type="button" onClick={() => onChange(format(subDays(parsed, 1), 'yyyy-MM-dd'))} aria-label="Giorno precedente"><Icon name="chevron-left" /></button>
    <div><span className="day-weekday">{weekday[0].toUpperCase() + weekday.slice(1)}</span><span className="day-date">{format(parsed, 'd MMMM yyyy', { locale: it })}</span></div>
    <button type="button" onClick={() => onChange(format(addDays(parsed, 1), 'yyyy-MM-dd'))} aria-label="Giorno successivo"><Icon name="chevron-right" /></button>
  </div>
}
