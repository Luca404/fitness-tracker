import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('./WorkoutPage', () => ({ default: () => <p>Le schede palestra</p> }))
vi.mock('./GymProgressPage', () => ({ default: () => <p>Andamento degli esercizi</p> }))
import FitnessPage from './FitnessPage'

afterEach(cleanup)
function Location() { return <span data-testid="location">{useLocation().search}</span> }
function renderPage(path = '/fitness') {
  render(<MemoryRouter initialEntries={[path]}><Location /><Routes>
    <Route path="/fitness" element={<FitnessPage />} />
    <Route path="/weight" element={<p>Pagina Peso</p>} />
  </Routes></MemoryRouter>)
}

describe('Fitness sections', () => {
  it('opens progress directly, switches sections, and keeps unrelated query parameters', async () => {
    renderPage('/fitness?tab=progress&source=link')
    expect(await screen.findByText('Andamento degli esercizi')).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Progressi/ }).getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByRole('tab', { name: /Peso/ })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: /Allenamenti/ }))
    expect(await screen.findByText('Le schede palestra')).toBeTruthy()
    expect(screen.getByTestId('location').textContent).toBe('?source=link')
    fireEvent.click(screen.getByRole('tab', { name: /Progressi/ }))
    expect(await screen.findByText('Andamento degli esercizi')).toBeTruthy()
  })

  it('redirects existing weight-tab bookmarks to the standalone weight page', async () => {
    renderPage('/fitness?tab=weight')
    expect(await screen.findByText('Pagina Peso')).toBeTruthy()
    expect(screen.queryByRole('tablist')).toBeNull()
  })
})
