import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ dismissTutorial: vi.fn() }))
vi.mock('../contexts/DataContext', () => ({ useData: () => mocks }))
import TutorialPage from './TutorialPage'

beforeEach(() => { mocks.dismissTutorial.mockReset().mockResolvedValue(undefined) })
afterEach(cleanup)

function renderPage(path: string) {
  render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/tutorial" element={<TutorialPage />} />
    <Route path="/meals" element={<h1>Pasti</h1>} />
    <Route path="/settings" element={<h1>Impostazioni</h1>} />
  </Routes></MemoryRouter>)
}

describe('TutorialPage', () => {
  it('enters the diary after skipping the first-run guide', () => {
    renderPage('/tutorial')
    fireEvent.click(screen.getByRole('button', { name: 'Salta tutorial' }))
    expect(screen.getByRole('heading', { name: 'Pasti' })).toBeTruthy()
    expect(mocks.dismissTutorial).toHaveBeenCalledOnce()
  })

  it('returns to settings after completing a replay', () => {
    renderPage('/tutorial?from=settings')
    fireEvent.click(screen.getByRole('button', { name: 'Tappa 6: Non solo calorie' }))
    fireEvent.click(screen.getByRole('button', { name: 'Inizia a usare fitTrackr' }))
    expect(screen.getByRole('heading', { name: 'Impostazioni' })).toBeTruthy()
    expect(mocks.dismissTutorial).toHaveBeenCalledOnce()
  })

  it('never uses an arbitrary return URL', () => {
    renderPage('/tutorial?from=https://example.org')
    fireEvent.click(screen.getByRole('button', { name: 'Salta tutorial' }))
    expect(screen.getByRole('heading', { name: 'Pasti' })).toBeTruthy()
  })
})
