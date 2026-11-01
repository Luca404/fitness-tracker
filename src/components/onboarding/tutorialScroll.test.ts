import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetDocumentScroll, revealTutorialTarget } from './tutorialScroll'

afterEach(() => {
  document.body.replaceChildren()
  document.body.scrollTop = 0
  document.documentElement.scrollTop = 0
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('tour scrolling', () => {
  it('reveals a control inside its panel without scrolling the document or calling scrollIntoView', () => {
    const panel = document.createElement('div')
    panel.style.overflowY = 'auto'
    const control = document.createElement('button')
    const nativeScroll = vi.fn()
    control.scrollIntoView = nativeScroll
    panel.append(control)
    document.body.append(panel)
    Object.defineProperties(panel, { clientHeight: { value: 200 }, scrollHeight: { value: 1000 } })
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 100, 300, 200))
    vi.spyOn(control, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 700, 200, 48))
    document.documentElement.scrollTop = 120
    document.body.scrollTop = 120
    revealTutorialTarget(control)
    expect(panel.scrollTop).toBe(588)
    expect(document.documentElement.scrollTop).toBe(120)
    expect(document.body.scrollTop).toBe(120)
    expect(nativeScroll).not.toHaveBeenCalled()
  })

  it('resets a previously scrolled document and window on exit', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    vi.stubGlobal('scrollY', 120)
    document.body.scrollTop = 120
    document.documentElement.scrollTop = 120
    resetDocumentScroll()
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    expect(document.body.scrollTop).toBe(0)
    expect(document.documentElement.scrollTop).toBe(0)
  })
})
