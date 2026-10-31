import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))
vi.mock('../contexts/DataContext', () => ({ useData: () => ({
  profile: null, goals: null, currentWeightKg: null, rollingWeightKg: null, rollingWeightSampleCount: 0,
}) }))
import SettingsPage from './SettingsPage'

afterEach(cleanup)

describe('settings guide entry', () => {
  it('opens the guide with a return path to settings', () => {
    render(<MemoryRouter initialEntries={['/settings']}><Routes>
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/tutorial" element={<h1>Tutorial</h1>} />
    </Routes></MemoryRouter>)
    const link = screen.getByRole('link', { name: 'Rivedi il tutorial' })
    expect(link.getAttribute('href')).toBe('/tutorial?from=settings')
    fireEvent.click(link)
    expect(screen.getByRole('heading', { name: 'Tutorial' })).toBeTruthy()
  })
})
