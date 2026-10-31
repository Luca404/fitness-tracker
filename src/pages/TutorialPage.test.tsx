import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../components/onboarding/QuickTutorial', () => ({ default: ({ onFinish }: { onFinish: () => void }) => <>
  <h1>Tour dimostrativo</h1><button onClick={onFinish}>Salta</button>
</> }))
import TutorialPage from './TutorialPage'

afterEach(cleanup)

describe('TutorialPage lifecycle', () => {
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
