import { useCallback, useState } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DataSnapshotProvider } from './contexts/DataContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { createTutorialStore } from './components/onboarding/tutorialStore'

const mocks = vi.hoisted(() => ({
  from: vi.fn(), rpc: vi.fn(), invoke: vi.fn(), dismiss: vi.fn(),
  auth: { user: { id: 'real-user' }, loading: false, isPasswordRecovery: false },
}))
vi.mock('./contexts/AuthContext', () => ({ useAuth: () => mocks.auth }))
vi.mock('./services/supabase', () => ({ supabase: { from: mocks.from, rpc: mocks.rpc, functions: { invoke: mocks.invoke } } }))
vi.mock('./services/fitnessPoints', () => ({ getFitnessPoints: vi.fn().mockResolvedValue({ enabled: true, total: 0, streak: 0 }) }))
import App from './App'

function Application() {
  const [base] = useState(() => createTutorialStore('2026-10-31').data())
  const [seen, setSeen] = useState(true)
  const dismissTutorial = useCallback(async () => { mocks.dismiss(); setSeen(true) }, [])
  return <SettingsProvider><DataSnapshotProvider value={{ ...base,
    profileUserId: 'real-user', profile: { ...base.profile!, user_id: 'real-user', tutorial_seen: seen }, dismissTutorial,
  }}><App /></DataSnapshotProvider></SettingsProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(20, 100, 200, 48))
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  for (const method of [mocks.from, mocks.rpc, mocks.invoke]) method.mockImplementation(() => { throw new Error('Live API call forbidden') })
  window.history.replaceState({}, '', '/settings')
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('tutorial within the complete app', () => {
  it('keeps the real browser URL in the guide when Cucina is clicked, then restores usable app navigation', async () => {
    render(<Application />)
    fireEvent.click(await screen.findByRole('link', { name: 'Rivedi il tutorial' }, { timeout: 6000 }))
    await screen.findByRole('heading', { name: 'Partiamo dalla Cucina' }, { timeout: 6000 })
    await waitFor(() => expect(document.querySelector('[data-tour="nav-kitchen"]')?.hasAttribute('aria-describedby')).toBe(true), { timeout: 6000 })
    await act(async () => { screen.getByRole('link', { name: 'Cucina' }).click() })
    expect(await screen.findByRole('heading', { name: 'Aggiungi un ingrediente' }, { timeout: 6000 })).toBeTruthy()
    expect(window.location.pathname).toBe('/tutorial')
    expect(screen.getByRole('region', { name: 'Tutorial interattivo' })).toBeTruthy()
    expect(document.querySelector('[data-tutorial-demo]')).toBeTruthy()
    expect(mocks.dismiss).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()

    // Reproduce a stale viewport left by the previous implementation.
    document.body.scrollTop = 160
    document.documentElement.scrollTop = 160
    fireEvent.click(screen.getByRole('button', { name: 'Salta' }))
    expect(await screen.findAllByRole('heading', { name: 'Impostazioni' }, { timeout: 6000 })).toBeTruthy()
    expect(document.body.scrollTop).toBe(0)
    expect(document.documentElement.scrollTop).toBe(0)
    expect(document.body.style.overflow).toBe('')
    expect(document.documentElement.style.overflow).toBe('')
    expect(document.documentElement.hasAttribute('data-tutorial')).toBe(false)
    expect(document.documentElement.style.getPropertyValue('--tutorial-coach-height')).toBe('')
    expect(document.documentElement.style.getPropertyValue('--tutorial-viewport-height')).toBe('')
    expect(document.querySelector('[data-tutorial-demo]')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'fitTrackr' }))
    await screen.findByRole('button', { name: /Aggiungi pasto/ }, { timeout: 6000 })
    expect(window.location.pathname).toBe('/meals')
    const header = document.querySelector('.app-sidebar') as HTMLElement
    expect(within(header).getByRole('button', { name: 'fitTrackr' })).toBeTruthy()
    expect(within(header).getByRole('link', { name: 'Impostazioni' })).toBeTruthy()
    expect(document.querySelector('.app-shell')?.classList.contains('fixed')).toBe(true)

    // A second replay must also clean up its listeners and restore the header.
    fireEvent.click(screen.getByRole('link', { name: 'Impostazioni' }))
    fireEvent.click(await screen.findByRole('link', { name: 'Rivedi il tutorial' }, { timeout: 6000 }))
    await screen.findByRole('heading', { name: 'Partiamo dalla Cucina' }, { timeout: 6000 })
    fireEvent.keyDown(document, { key: 'Escape' })
    await screen.findAllByRole('heading', { name: 'Impostazioni' }, { timeout: 6000 })
    fireEvent.click(screen.getByRole('button', { name: 'fitTrackr' }))
    await screen.findByRole('button', { name: /Aggiungi pasto/ }, { timeout: 6000 })
    expect(screen.getByRole('link', { name: 'Impostazioni' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Tutorial interattivo' })).toBeNull()
    expect(mocks.dismiss).toHaveBeenCalledTimes(2)
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(mocks.invoke).not.toHaveBeenCalled()
  }, 30000)
})
