import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('./contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' }, loading: false }) }))
vi.mock('./contexts/DataContext', () => ({ useData: () => ({
  profile: {}, profileStatus: 'ready', profileUserId: 'user-1', toast: null,
}) }))
vi.mock('./pages/LoginPage', () => ({ default: () => null }))
vi.mock('./pages/OnboardingPage', () => ({ default: () => null }))
vi.mock('./pages/MealsPage', () => ({ default: () => <p>Diario pasti</p> }))
vi.mock('./pages/WeightPage', () => ({ default: () => <h1>Peso corporeo</h1> }))
vi.mock('./pages/WellbeingPage', () => ({ default: () => <h1>Dettaglio buone abitudini</h1> }))
import App from './App'
afterEach(cleanup)

describe('main navigation', () => {
  it('keeps wellbeing as a meal detail and redirects its existing address', async () => {
    window.history.replaceState({}, '', '/wellbeing')
    render(<App />)
    expect(await screen.findByText('Dettaglio buone abitudini')).toBeTruthy()
    expect(window.location.pathname).toBe('/meals/wellbeing')
    expect(screen.getByRole('link', { name: 'Pasti' }).getAttribute('aria-current')).toBe('page')
    expect(screen.queryByRole('link', { name: 'Benessere' })).toBeNull()
    fireEvent.click(screen.getByRole('link', { name: 'Peso' }))
    expect(await screen.findByRole('heading', { name: 'Peso corporeo' })).toBeTruthy()
    expect(window.location.pathname).toBe('/weight')
    expect(screen.getByRole('link', { name: 'Peso' }).getAttribute('aria-current')).toBe('page')
    expect(screen.queryByRole('tablist')).toBeNull()
  })
})
