import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../../contexts/DataContext'
import { getGuideline } from '../../data/nutritionGuidelines'
import { calculateHabitRows, habitExcessLabel, habitStatus, habitTileFill, habitWindow, summarizeHabitRows } from '../../utils/goodHabits'
import type { Meal } from '../../types'
import { formatDecimal } from '../../utils/decimal'

interface Props {
  selectedDate: string
  currentMeals: Meal[]
  compact?: boolean
}

export default function GoodHabits({ selectedDate, currentMeals, compact = false }: Props) {
  const { profile, goals, mealRevision, getWeeklyMeals } = useData()
  const { from, to } = habitWindow(selectedDate)
  const requestKey = `${from}:${to}:${mealRevision}`
  const [week, setWeek] = useState<{ key: string; meals: Meal[]; failed?: boolean }>({ key: '', meals: [] })
  const loading = week.key !== requestKey
  const weeklyUnavailable = loading || week.failed

  useEffect(() => {
    let cancelled = false
    getWeeklyMeals(from, to)
      .then(meals => { if (!cancelled) setWeek({ key: requestKey, meals }) })
      .catch(() => { if (!cancelled) setWeek({ key: requestKey, meals: [], failed: true }) })
    return () => { cancelled = true }
  }, [from, to, requestKey, getWeeklyMeals])

  const rows = useMemo(() => {
    const sex = profile?.sex ?? 'female'
    const age = profile?.age ?? 18
    return calculateHabitRows(selectedDate, currentMeals, loading ? [] : week.meals, {
      vegetables: getGuideline('vegetables', sex, age)?.limitValue ?? 400,
      fruit: getGuideline('fruit', sex, age)?.limitValue ?? 360,
      legumes: getGuideline('legumes', sex, age)?.limitValue ?? 450,
      fish: getGuideline('fish', sex, age)?.limitValue ?? 300,
      fiber: getGuideline('fiber', sex, age)?.limitValue ?? 25,
      salt: getGuideline('salt', sex, age)?.limitValue ?? 5,
      sugars: (goals?.calorie_target ?? 2000) * (getGuideline('total_sugars', sex, age)?.limitValue ?? 15) / 100 / 4,
      alcohol: age < 18 ? 0 : (getGuideline('alcohol', sex, age)?.limitValue ?? 12) / 12,
    }).map(row => weeklyUnavailable && row.period === 'ultimi 7 giorni' ? { ...row, value: null } : row)
  }, [currentMeals, profile, goals, selectedDate, loading, weeklyUnavailable, week.meals])

  if (compact) {
    const summary = summarizeHabitRows(rows)
    return (
      <Link
        to="/wellbeing"
        className="group block rounded-2xl border border-gray-700/70 bg-gray-800/55 px-4 py-3 transition hover:border-primary-700 hover:bg-gray-800"
        aria-label="Apri il dettaglio delle buone abitudini"
      >
        <span className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">🌿</span>
          <span className="text-sm font-semibold text-gray-200">Buone abitudini</span>
          <span className="ml-auto truncate text-[11px] text-gray-500">
            {loading
              ? 'Aggiorno…'
              : `${summary.ok} su ${rows.filter(row => row.direction !== 'info').length} in linea`}
          </span>
        </span>
        <span className="mt-2 grid grid-cols-8 gap-1.5">
          {rows.map(row => {
            const weekly = row.period === 'ultimi 7 giorni'
            const status = habitStatus(row)
            const statusLabel = status === 'ok' ? 'in linea' : status === 'attention' ? 'da migliorare' : status === 'informative' ? 'informativo' : 'dato incompleto'
            const fill = habitTileFill(row)
            const overMaximum = row.direction === 'max' && row.value != null && row.value > (row.target ?? Infinity)
            const excessLabel = habitExcessLabel(row)
            const valueLabel = row.value == null ? 'dato non disponibile' : `${row.partial ? 'almeno ' : ''}${formatDecimal(row.value)} ${row.unit ?? 'g'}`
            const limitLabel = row.target == null ? '' : `, limite ${formatDecimal(row.target)} ${row.unit ?? 'g'}`
            const progressLabel = row.value == null || row.target == null ? '' : row.direction === 'min'
              ? `, ${Math.round(row.value / row.target * 100)}% dell'obiettivo`
              : overMaximum ? row.target > 0 ? `, soglia superata del ${Math.round((row.value - row.target) / row.target * 100)}%` : ', soglia superata' : ', entro la soglia'
            const weeklyLabel = weekly && row.value != null ? `, ${formatDecimal(row.value)} g negli ultimi 7 giorni, media ${formatDecimal(row.value / 7)} g al giorno, obiettivo ${formatDecimal(row.target!)} g su 7 giorni` : ''
            const tileLabel = `${row.label}: ${statusLabel}${row.direction === 'max' ? `, ${valueLabel}${limitLabel}` : weeklyLabel}${progressLabel}${excessLabel && row.target! > 0 ? `, ${excessLabel} del limite` : ''}`
            return (
              <span key={row.label}
                className={`relative flex min-w-0 flex-col items-center overflow-hidden rounded-lg border px-0.5 py-1 ${
                  status === 'ok' ? 'border-emerald-700/50 bg-emerald-500/10' :
                    status === 'attention' ? 'border-amber-700/50 bg-amber-500/10' : 'border-gray-700 bg-gray-900/40'
                }`}
                aria-label={tileLabel}
                title={tileLabel}
              >
                {fill > 0 && <span className={`absolute inset-x-0 bottom-0 transition-all ${overMaximum ? 'bg-orange-500/35' : 'bg-primary-500/25'}`}
                  style={{ height: `${fill}%` }} aria-hidden="true" />}
                <span className="relative text-base leading-none" aria-hidden="true">{row.icon}</span>
                {row.direction === 'max' && <span className="relative mt-1 whitespace-nowrap text-[10px] font-medium leading-none text-gray-300" aria-hidden="true">
                  {row.value == null ? '–' : `${row.partial ? '≈' : ''}${formatDecimal(row.value)}${row.unit ?? 'g'}`}
                </span>}
                {weekly && <span className="relative mt-1 whitespace-nowrap text-[9px] font-medium leading-none text-gray-300" aria-hidden="true">
                  {row.value == null ? '–' : `${formatDecimal(row.value / 7, 0)}g/d`}
                </span>}
                <span className={`relative mt-0.5 text-xs font-bold leading-none ${
                  status === 'ok' ? 'text-emerald-400' : status === 'attention' ? 'text-amber-400' : 'text-gray-500'
                }`} aria-hidden="true">{excessLabel ?? (status === 'ok' ? '✓' : status === 'attention' ? '×' : status === 'informative' ? 'i' : '–')}</span>
              </span>
            )
          })}
        </span>
        <span className="mt-2 block text-[10px] text-gray-500">Legumi e pesce: media degli ultimi 7 giorni</span>
      </Link>
    )
  }

  const dailyRows = rows.filter(row => row.period === 'oggi')
  const weeklyRows = rows.filter(row => row.period === 'ultimi 7 giorni')

  function renderRows(habitRows: typeof rows) {
    return habitRows.map(row => {
      const progress = row.value == null || row.target == null ? 0 : row.target <= 0 ? (row.value > 0 ? 100 : 0) : Math.min(100, Math.round((row.value / row.target) * 100))
      const overMaximum = row.direction === 'max' && row.value != null && row.value > (row.target ?? Infinity)
      const excessLabel = habitExcessLabel(row)
      const displayValue = row.value == null ? null : formatDecimal(row.value)
      return (
        <div key={row.label} className="rounded-2xl border border-gray-800 bg-gray-800/55 p-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{row.icon}</span>
            <span className="text-sm font-semibold">{row.label}</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {displayValue == null ? (
              <span className="text-gray-600">Dato non disponibile</span>
            ) : (
              <>
                <span className={`font-semibold ${overMaximum ? 'text-orange-400' : 'text-gray-300'}`}>{row.partial ? '≈ ' : ''}{displayValue} {row.unit ?? 'g'}</span>
                {row.target != null && <> {row.direction === 'max' ? '≤' : '≥'} {formatDecimal(row.target)} {row.unit ?? 'g'}</>}
                {excessLabel && <span className="ml-1 font-semibold text-orange-400">· {excessLabel}{row.target! > 0 ? ' del limite' : ' limite superato'}</span>}
                {row.partial && <span className="text-amber-500/80"> · parziale</span>}
              </>
            )}
          </p>
          {row.period === 'ultimi 7 giorni' && row.value != null && <p className="mt-1 text-xs text-gray-400">
            Media: {formatDecimal(row.value / 7)} g/giorno
          </p>}
          {row.direction !== 'info' && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-700">
            <div className={`h-full rounded-full transition-all ${overMaximum ? 'bg-orange-500' : 'bg-primary-500'}`} style={{ width: `${progress}%` }} />
          </div>}
        </div>
      )
    })
  }

  return (
    <section>
      <div className="mb-3 flex items-end justify-between px-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Alimentazione</p>
          <h2 className="mt-0.5 text-lg font-bold">Buone abitudini</h2>
        </div>
        {loading && <span className="text-xs text-gray-600">Aggiorno…</span>}
      </div>
      <div className="space-y-5">
        <div>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Oggi</p>
          <div className="grid grid-cols-2 gap-2">{renderRows(dailyRows)}</div>
        </div>
        <div>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Ultimi 7 giorni</p>
          <p className="mb-2 px-1 text-xs text-gray-500">Fino alla data selezionata · target settimanale, media su 7 giorni</p>
          <div className="grid grid-cols-2 gap-2">{renderRows(weeklyRows)}</div>
        </div>
      </div>
    </section>
  )
}
