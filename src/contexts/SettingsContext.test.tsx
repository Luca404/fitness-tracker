import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SettingsProvider, useSettings } from './SettingsContext'
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 4, 23, 59, 59)) })
afterEach(() => { cleanup(); vi.useRealTimers() })
it('updates today at local midnight while preserving the selected historical date', () => {
  const { result } = renderHook(useSettings, { wrapper: SettingsProvider })
  act(() => result.current.setSelectedDate('2026-09-20'))
  act(() => vi.advanceTimersByTime(1200))
  expect(result.current.today).toBe('2026-10-05')
  expect(result.current.selectedDate).toBe('2026-09-20')
})
it('updates today when the installed app resumes after being suspended', () => {
  const { result } = renderHook(useSettings, { wrapper: SettingsProvider })
  act(() => { vi.setSystemTime(new Date(2026, 9, 7, 10)); window.dispatchEvent(new Event('focus')) })
  expect(result.current.today).toBe('2026-10-07')
  expect(result.current.selectedDate).toBe('2026-10-04')
})
