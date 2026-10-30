import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  auth: { user: { id: 'user-1' } as { id: string } | null, loading: false, isPasswordRecovery: false },
  data: {
    profile: {}, profileStatus: 'ready', profileUserId: 'user-1', toast: null,
  },
}))
vi.mock('./contexts/AuthContext', () => ({ useAuth: () => mocks.auth }))
vi.mock('./contexts/DataContext', () => ({ useData: () => mocks.data }))
vi.mock('./pages/LoginPage', () => ({ default: () => null }))
vi.mock('./pages/ResetPasswordPage', () => ({ default: () => <h1>Reimposta password</h1> }))
vi.mock('./pages/OnboardingPage', () => ({ default: () => null }))
vi.mock('./pages/MealsPage', () => ({ default: () => <p>Diario pasti</p> }))
vi.mock('./pages/WeightPage', () => ({ default: () => <h1>Peso corporeo</h1> }))
vi.mock('./pages/WellbeingPage', () => ({ default: () => <h1>Dettaglio buone abitudini</h1> }))
import App from './App'
beforeEach(() => {
  mocks.auth.user = { id: 'user-1' }
  mocks.auth.loading = false
  mocks.auth.isPasswordRecovery = false
  mocks.data.profileStatus = 'ready'
  mocks.data.profileUserId = 'user-1'
})
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

  it.each(['loading', 'error', 'missing'])('shows password recovery before a %s profile', profileStatus => {
    window.history.replaceState({}, '', '/')
    mocks.auth.isPasswordRecovery = true
    mocks.data.profileStatus = profileStatus
    mocks.data.profileUserId = ''
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Reimposta password' })).toBeTruthy()
  })

  it('keeps expired recovery links reachable without an authenticated user', () => {
    window.history.replaceState({}, '', '/reset-password#error_code=otp_expired')
    mocks.auth.user = null
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Reimposta password' })).toBeTruthy()
  })
})
