import { lazy } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Layout from './Layout'
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers() })
function BrokenPage(): never { throw new Error('Page render failed') }
describe('navigation error recovery', () => {
  it('offers recovery if a page import never finishes, while keeping navigation available', () => {
    vi.useFakeTimers()
    const StuckPage = lazy(() => new Promise<never>(() => undefined))
    render(<MemoryRouter initialEntries={['/kitchen']}><Routes><Route element={<Layout />}>
      <Route path="/kitchen" element={<StuckPage />} />
      <Route path="/meals" element={<p>Diario disponibile</p>} />
    </Route></Routes></MemoryRouter>)
    expect(screen.getByRole('status').textContent).toContain('Caricamento')
    expect(screen.queryByRole('button', { name: 'Ricarica app' })).toBeNull()
    act(() => vi.advanceTimersByTime(15_000))
    expect(screen.getByRole('button', { name: 'Ricarica app' })).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: 'Pasti' }))
    expect(screen.getByText('Diario disponibile')).toBeTruthy()
  })

  it.each(['render', 'import'])('keeps navigation usable after a failed %s and recovers on another page', async failure => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const Page = failure === 'render' ? BrokenPage : lazy(() => Promise.reject(new Error('Chunk unavailable')))
    render(<MemoryRouter initialEntries={['/kitchen']}><Routes><Route element={<Layout />}>
      <Route path="/kitchen" element={<Page />} />
      <Route path="/meals" element={<p>Diario disponibile</p>} />
    </Route></Routes></MemoryRouter>)
    expect((await screen.findByRole('alert')).textContent).toContain('Non è stato possibile aprire questa pagina')
    expect(screen.getByRole('button', { name: 'Ricarica app' })).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: 'Pasti' }))
    expect(await screen.findByText('Diario disponibile')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
