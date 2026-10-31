import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import QuickTutorial from './QuickTutorial'

afterEach(cleanup)

describe('QuickTutorial', () => {
  it('supports the whole guide, backward navigation, and a single final action', () => {
    const onFinish = vi.fn()
    render(<QuickTutorial onFinish={onFinish} />)
    expect(screen.getByRole('heading', { name: 'Parti dagli ingredienti' })).toBe(document.activeElement)
    expect(screen.queryByRole('button', { name: 'Indietro' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Avanti' }))
    expect(screen.getByRole('heading', { name: 'Un piatto, più porzioni' })).toBe(document.activeElement)
    fireEvent.click(screen.getByRole('button', { name: 'Indietro' }))
    expect(screen.getByRole('heading', { name: 'Parti dagli ingredienti' })).toBeTruthy()

    for (let index = 0; index < 5; index += 1) fireEvent.click(screen.getByRole('button', { name: 'Avanti' }))
    expect(screen.getByRole('heading', { name: 'Non solo calorie' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Avanti' })).toBeNull()
    expect(onFinish).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Inizia a usare fitTrackr' }))
    expect(onFinish).toHaveBeenCalledOnce()
  })

  it('offers skip on every step and allows jumping to a topic', () => {
    const onFinish = vi.fn()
    render(<QuickTutorial onFinish={onFinish} />)
    const steps = screen.getAllByRole('button', { name: /^Tappa/ })
    steps.forEach(button => {
      fireEvent.click(button)
      expect(button.getAttribute('aria-current')).toBe('step')
      expect(steps.filter(item => item.getAttribute('aria-current') === 'step')).toHaveLength(1)
      fireEvent.click(screen.getByRole('button', { name: 'Salta tutorial' }))
    })
    expect(onFinish).toHaveBeenCalledTimes(6)
  })
})
