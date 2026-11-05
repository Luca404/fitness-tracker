import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ActiveFitnessPoints, PointsDay } from '../services/fitnessPoints'
const mock = vi.hoisted(() => ({ value: {} as Record<string, unknown>, setDate: vi.fn() }))
vi.mock('../contexts/FitnessPointsContext', () => ({ useFitnessPoints: () => mock.value }))
vi.mock('../contexts/SettingsContext', () => ({ useSettings: () => ({ selectedDate: '2026-11-04', setSelectedDate: mock.setDate }) }))
vi.mock('../components/points/Leaderboard', () => ({ default: () => <h2>Classifica generale</h2> }))
import PointsPage from './PointsPage'
import PointsHeader from '../components/common/PointsHeader'

function day(): PointsDay {
  return { date: '2026-11-03', meal_count: 1, registered: false, streak: 0, points: -1, movement_raw: 0, awards: [
    { key: 'diary', kind: 'diary', label: 'Giornata registrata', points: 0, detail: { status: 'target' } },
    { key: 'salt', kind: 'penalty', label: 'Sale', points: -1, detail: { value: 7.5, target: 5, unit: 'g', status: 'excess' } },
    { key: 'sugars', kind: 'habit', label: 'Zuccheri totali', points: 0, detail: { value: null, target: 75, unit: 'g', status: 'incomplete' } },
  ] }
}
function active(): ActiveFitnessPoints {
  const d = day()
  return { enabled: true, started_on: '2026-11-01', timezone: 'Europe/Rome', rules_version: 4,
    today: '2026-11-04', selected_date: d.date, sugars_target: 75, alcohol_target: 1, total: 123, net_total: 123,
    streak: 0, best_streak: 3, registered_days: 3, day: d, history: [d], has_older: false }
}
function Subject() { return <MemoryRouter initialEntries={['/points']}><PointsHeader /><Routes><Route path="/points" element={<PointsPage />} /><Route path="/meals" element={<p>Diario</p>} /></Routes></MemoryRouter> }
beforeEach(() => {
  vi.clearAllMocks()
  mock.value = { data: active(), summary: { total: 123, streak: 0 }, loading: false, error: null, refresh: vi.fn() }
})
afterEach(cleanup)
describe('points recap', () => {
  it('switches to the leaderboard and restores the selected recap day', () => {
    render(<Subject />)
    fireEvent.click(screen.getByRole('link', { name: 'Classifica' }))
    expect(screen.getByRole('heading', { name: 'Classifica generale' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Giorno precedente' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Punti per giorno' })).toBeNull()
    fireEvent.click(screen.getByRole('link', { name: 'I miei punti' }))
    expect(screen.getByRole('heading', { name: 'mar 3 nov' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Punti per giorno' })).toBeNull()
  })
  it('shows total and streak in the header with an accessible recap link', () => {
    render(<Subject />)
    const link = screen.getByRole('link', { name: `${(123).toLocaleString('it-IT')} punti totali, streak di 0 giorni. Apri riepilogo punti` })
    expect(link.getAttribute('href')).toBe('/points')
    expect(screen.getByRole('heading', { name: 'mar 3 nov' })).toBeTruthy()
    expect(screen.getByText('Dati incompleti')).toBeTruthy()
    expect(screen.getAllByText(/^−1$/)).toHaveLength(2)
  })
  it('shows automatic diary points and pending wellbeing without confirmation controls', () => {
    const data = active()
    data.day = { ...data.day!, date: data.today, meal_count: 2, registered: true, points: 2,
      awards: data.day!.awards.map(a => ({ ...a, points: a.kind === 'diary' ? 2 : 0,
        detail: { ...a.detail, status: a.kind === 'diary' ? 'earned' : 'pending' } })) }
    data.selected_date = data.today
    data.history = [data.day]
    mock.value.data = data
    render(<Subject />)
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByRole('button', { name: /Conferma/ })).toBeNull()
    expect(screen.getByText('Diario registrato')).toBeTruthy()
    expect(screen.getAllByText('A fine giornata')).toHaveLength(2)
    expect(screen.queryByText(/Giornata in corso/)).toBeNull()
  })
  it('opens the diary on the day being reviewed', () => {
    render(<Subject />)
    fireEvent.click(screen.getByRole('link', { name: 'Completa il diario →' }))
    expect(mock.setDate).toHaveBeenCalledWith('2026-11-03')
    expect(screen.getByText('Diario')).toBeTruthy()
  })
  it('opens the recap directly with points already active', () => {
    render(<Subject />)
    expect(screen.getByRole('heading', { name: 'mar 3 nov' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Attiva i punti' })).toBeNull()
    expect(screen.getByText('Come si guadagnano i punti')).toBeTruthy()
  })
  it('shows diary progress and missed goals without repeated explanations', () => {
    const data = active()
    data.day!.awards.push({ key: 'fruit', kind: 'penalty', label: 'Frutta', points: -1,
      detail: { status: 'missed', value: 0, target: 360, unit: 'g' } })
    mock.value.data = data
    render(<Subject />)
    expect(screen.getByText('1 di 2 momenti alimentari')).toBeTruthy()
    expect(screen.queryByText(/Seleziona una giornata/)).toBeNull()
    expect(screen.getByText('Obiettivo non raggiunto')).toBeTruthy()
    expect(screen.queryByText(/tre momenti alimentari/)).toBeNull()
    expect(screen.getByText(/da 15 g costa 3 PT/)).toBeTruthy()
    expect(screen.getByText(/−3 PT ciascuno se mancati/)).toBeTruthy()
  })
  it('places the day selector before the heading and summary and removes the today shortcut', () => {
    render(<Subject />)
    const previousDay = screen.getByRole('button', { name: 'Giorno precedente' })
    const title = screen.getByRole('heading', { name: 'Punti e costanza' })
    expect(previousDay.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Vai a oggi' })).toBeNull()
  })
  it('keeps the header numbers visible during background refresh and error', () => {
    mock.value.loading = true
    mock.value.error = 'Impossible caricare i punti. Riprova.'
    render(<Subject />)
    const link = screen.getByRole('link', { name: /123 punti totali, streak di 0 giorni/ })
    expect(link.textContent).toContain('123')
    expect(link.textContent).not.toContain('…')
    expect(link.textContent).not.toContain('—')
  })
  it('handles a read failure without displaying made-up zero scores', () => {
    mock.value.data = null
    mock.value.summary = null
    mock.value.error = 'Impossible caricare i punti. Riprova.'
    render(<Subject />)
    expect(screen.getByRole('alert')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }))
    expect(mock.value.refresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Punti totali')).toBeNull()
  })
})
