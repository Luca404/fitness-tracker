import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installChunkRecovery } from './chunkRecovery'
let cleanup: (() => void) | undefined
beforeEach(() => { sessionStorage.clear(); vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true) })
afterEach(() => { cleanup?.(); vi.restoreAllMocks() })
describe('page import recovery', () => {
  it('reloads only once per build, including after the app restarts', () => {
    const reload = vi.fn()
    cleanup = installChunkRecovery('build-a', reload)
    window.dispatchEvent(new Event('vite:preloadError'))
    window.dispatchEvent(new Event('vite:preloadError'))
    cleanup()
    cleanup = installChunkRecovery('build-a', reload)
    window.dispatchEvent(new Event('vite:preloadError'))
    expect(reload).toHaveBeenCalledTimes(1)
    cleanup()
    cleanup = installChunkRecovery('build-b', reload)
    window.dispatchEvent(new Event('vite:preloadError'))
    expect(reload).toHaveBeenCalledTimes(2)
    expect(sessionStorage.length).toBe(1)
  })
  it('stays usable offline without consuming the recovery attempt', () => {
    const reload = vi.fn()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    cleanup = installChunkRecovery('build', reload)
    window.dispatchEvent(new Event('vite:preloadError'))
    expect(reload).not.toHaveBeenCalled()
    expect(sessionStorage.length).toBe(0)
  })
  it('avoids reload loops when session storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    const reload = vi.fn()
    cleanup = installChunkRecovery('build', reload)
    window.dispatchEvent(new Event('vite:preloadError'))
    expect(reload).not.toHaveBeenCalled()
  })
})
