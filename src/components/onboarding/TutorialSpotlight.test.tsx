import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TutorialSpotlight from './TutorialSpotlight'
import type { TutorialStep } from './tutorialSteps'

const step: TutorialStep = { id: 'test', chapter: 0, path: '/kitchen', scene: 'test',
  target: '[data-test-target]', action: '[data-test-target]', title: 'Prova guidata', description: 'Prova il pulsante evidenziato.', nextLabel: 'Continua' }

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
  vi.stubGlobal('innerWidth', 390)
  vi.stubGlobal('innerHeight', 844)
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

function guide() {
  const onNext = vi.fn()
  const onFinish = vi.fn()
  const unrelated = vi.fn()
  const rendered = render(<>
    <button data-test-target aria-describedby="existing-help">Pulsante reale</button>
    <button onClick={unrelated}>Elimina dati</button>
    <TutorialSpotlight step={step} index={0} total={3} onNext={onNext} onBack={() => {}} onChapter={() => {}} onFinish={onFinish} />
  </>)
  return { ...rendered, onNext, onFinish, unrelated }
}

describe('tutorial spotlight accessibility and recovery', () => {
  it('follows the target after scrolling and restores its original description on close', async () => {
    let top = 150
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const height = this.hasAttribute('data-tour-coach') ? 300 : 48
      return { top, left: 50, right: 250, bottom: top + height, width: 200, height, x: 50, y: top, toJSON: () => ({}) }
    })
    const { unmount } = guide()
    const target = screen.getByRole('button', { name: 'Pulsante reale' })
    await waitFor(() => expect(target.getAttribute('aria-describedby')).not.toBe('existing-help'))
    await waitFor(() => expect((document.querySelector('.tutorial-spotlight') as HTMLElement).style.top).toBe('144px'))
    top = 400
    fireEvent.scroll(window)
    await waitFor(() => expect((document.querySelector('.tutorial-spotlight') as HTMLElement).style.top).toBe('394px'))
    unmount()
    expect(target.getAttribute('aria-describedby')).toBe('existing-help')
  })

  it('keeps keyboard focus in the guide and highlighted control, blocks unrelated actions and closes with Escape', async () => {
    const { unrelated, onFinish } = guide()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Prova guidata' })).toBe(document.activeElement))
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Pulsante reale' }))
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Continua' }))
    fireEvent.click(screen.getByRole('button', { name: 'Elimina dati' }))
    expect(unrelated).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onFinish).toHaveBeenCalledOnce()
  })

  it('allows proceeding when a target never appears', async () => {
    vi.useFakeTimers()
    const onNext = vi.fn()
    render(<TutorialSpotlight step={step} index={0} total={3} onNext={onNext} onBack={() => {}} onChapter={() => {}} onFinish={() => {}} />)
    await act(async () => { vi.advanceTimersByTime(8000) })
    fireEvent.click(screen.getByRole('button', { name: 'Prosegui' }))
    expect(onNext).toHaveBeenCalledOnce()
  })
})
