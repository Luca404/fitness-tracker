import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsProvider } from '../../contexts/SettingsContext'
import { TUTORIAL_STEPS } from './tutorialSteps'

const live = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), invoke: vi.fn() }))
vi.mock('../../services/supabase', () => ({ supabase: { from: live.from, rpc: live.rpc, functions: { invoke: live.invoke } } }))
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'real-user' } }) }))
import QuickTutorial from './QuickTutorial'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Live HTTP is forbidden during the tour') }))
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    top: 150, left: 250, right: 450, bottom: 198, width: 200, height: 48, x: 250, y: 150, toJSON: () => ({}),
  })
  for (const method of Object.values(live)) method.mockImplementation(() => { throw new Error('Live Supabase is forbidden during the tour') })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

function renderGuide() {
  const onFinish = vi.fn()
  render(<MemoryRouter initialEntries={['/meals']}><SettingsProvider><QuickTutorial onFinish={onFinish} /></SettingsProvider></MemoryRouter>)
  return onFinish
}
async function continueStep(index: number) {
  const step = TUTORIAL_STEPS[index]
  await screen.findByRole('heading', { name: step.title })
  const guide = within(screen.getByRole('region', { name: 'Tutorial interattivo' }))
  const button = guide.getByRole('button', { name: step.nextLabel ?? 'Avanti' }) as HTMLButtonElement
  await waitFor(() => expect(button.disabled, `Step ${step.id}, target ${step.target}, found ${Boolean(document.querySelector(step.target))}`).toBe(false), { timeout: 6000 })
  fireEvent.click(button)
}

describe('interactive tutorial on real pages', () => {
  it('walks through real forms and local results without any live API or AI calls', async () => {
    const onFinish = renderGuide()
    expect(TUTORIAL_STEPS).toHaveLength(8)
    for (let index = 0; index < TUTORIAL_STEPS.length; index += 1) {
      await screen.findByRole('heading', { name: TUTORIAL_STEPS[index].title })
      if (TUTORIAL_STEPS[index].id === 'meals') {
        expect(await screen.findByText('Pronto da mangiare')).toBeTruthy()
      }
      await continueStep(index)
    }
    await waitFor(() => expect(onFinish).toHaveBeenCalledOnce())
    expect(live.from).not.toHaveBeenCalled()
    expect(live.rpc).not.toHaveBeenCalled()
    expect(live.invoke).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  }, 30000)

  it('supports highlighted clicks, backward navigation and jumping to a chapter', async () => {
    const onFinish = renderGuide()
    await waitFor(() => expect(document.querySelector('[data-tour="nav-kitchen"]')?.hasAttribute('aria-describedby')).toBe(true))
    fireEvent.click(screen.getByRole('link', { name: 'Cucina' }))
    await screen.findByRole('heading', { name: 'Ingredienti in tre modi' })
    fireEvent.click(screen.getByRole('button', { name: 'Indietro' }))
    await screen.findByRole('heading', { name: 'Partiamo dalla Cucina' })
    fireEvent.change(screen.getByRole('combobox', { name: 'Argomento del tutorial' }), { target: { value: '5' } })
    await screen.findByRole('heading', { name: 'Uno sguardo al benessere' })
    fireEvent.click(screen.getByRole('button', { name: 'Salta' }))
    expect(onFinish).toHaveBeenCalledOnce()
  })

  it('blocks unrelated buttons and keeps Escape available', async () => {
    const onFinish = renderGuide()
    await continueStep(0)
    await screen.findByRole('heading', { name: 'Ingredienti in tre modi' })
    fireEvent.click(screen.getByRole('button', { name: /Scansiona codice a barre/ }))
    expect(screen.getByRole('heading', { name: 'Ingredienti in tre modi' })).toBeTruthy()
    expect(screen.queryByText('Caricamento fotocamera…')).toBeNull()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onFinish).toHaveBeenCalledOnce()
  })
})
