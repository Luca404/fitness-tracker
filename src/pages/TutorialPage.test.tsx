import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../components/onboarding/QuickTutorial', () => ({ default: ({ onFinish }: { onFinish: () => void }) => <>
  <h1>Tour dimostrativo</h1><button onClick={onFinish}>Salta</button>
</> }))
import TutorialPage from './TutorialPage'

afterEach(cleanup)

describe('TutorialPage lifecycle', () => {
  it('locks document scrolling during the tour and resets it before showing the app again', () => {
    const previousBodyOverflow = document.body.style.overflow
    const previousRootOverflow = document.documentElement.style.overflow
    const { unmount } = render(<TutorialPage onFinish={() => {}} />)
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.documentElement.style.overflow).toBe('hidden')
    document.body.scrollTop = 120
    document.documentElement.scrollTop = 120
    unmount()
    expect(document.body.scrollTop).toBe(0)
    expect(document.documentElement.scrollTop).toBe(0)
    expect(document.body.style.overflow).toBe(previousBodyOverflow)
    expect(document.documentElement.style.overflow).toBe(previousRootOverflow)
  })

  it('lets the parent close the isolated router', () => {
    const onFinish = vi.fn()
    render(<TutorialPage onFinish={onFinish} />)
    fireEvent.click(screen.getByRole('button', { name: 'Salta' }))
    expect(onFinish).toHaveBeenCalledOnce()
  })
  it('handles browser back and removes its listener on unmount', () => {
    const onFinish = vi.fn()
    const { unmount } = render(<TutorialPage onFinish={onFinish} />)
    act(() => window.dispatchEvent(new PopStateEvent('popstate')))
    expect(onFinish).toHaveBeenCalledOnce()
    unmount()
    act(() => window.dispatchEvent(new PopStateEvent('popstate')))
    expect(onFinish).toHaveBeenCalledOnce()
  })
})
