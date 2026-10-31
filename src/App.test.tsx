import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  auth: { user: { id: 'user-1' } as { id: string } | null, loading: false, isPasswordRecovery: false },
  data: {
    profile: {} as { tutorial_seen?: boolean } | null, profileStatus: 'ready', profileUserId: 'user-1', toast: null,
    dismissTutorial: vi.fn(),
  },
}))
vi.mock('./contexts/AuthContext', () => ({ useAuth: () => mocks.auth }))
vi.mock('./contexts/DataContext', () => ({ useData: () => mocks.data }))
vi.mock('./pages/LoginPage', () => ({ default: () => null }))
vi.mock('./pages/ResetPasswordPage', () => ({ default: () => <h1>Reimposta password</h1> }))
vi.mock('./pages/OnboardingPage', () => ({ default: () => <h1>Configura il profilo</h1> }))
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
  mocks.data.profile = {}
  mocks.data.dismissTutorial.mockImplementation(() => {
    mocks.data.profile = { tutorial_seen: true }
    return Promise.resolve()
  })
})
afterEach(cleanup)

describe('main navigation', () => {
  it('opens the guide after initial profile setup and skipping leads to meals', async () => {
    window.history.replaceState({}, '', '/onboarding')
    mocks.data.profile = { tutorial_seen: false }
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Parti dagli ingredienti' })).toBeTruthy()
    expect(window.location.pathname).toBe('/tutorial')
    fireEvent.click(screen.getByRole('button', { name: 'Salta tutorial' }))
    expect(await screen.findByText('Diario pasti')).toBeTruthy()
    expect(window.location.pathname).toBe('/meals')
    expect(mocks.data.dismissTutorial).toHaveBeenCalled()
  })

  it('keeps profile setup before the tutorial', () => {
    window.history.replaceState({}, '', '/tutorial')
    mocks.data.profileStatus = 'missing'
    mocks.data.profile = null
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Configura il profilo' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Salta tutorial' })).toBeNull()
  })

  it.each([{}, { tutorial_seen: true }])('does not interrupt an existing profile: %j', async profile => {
    window.history.replaceState({}, '', '/meals')
    mocks.data.profile = profile
    render(<App />)
    expect(await screen.findByText('Diario pasti')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Parti dagli ingredienti' })).toBeNull()
  })

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
    mocks.data.profile = { tutorial_seen: false }
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
