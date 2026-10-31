import { describe, expect, it } from 'vitest'
import { spotlightCardHeight, spotlightPosition } from './spotlightPosition'

describe('spotlight card placement', () => {
  it('sits above mobile bottom navigation without covering the target', () => {
    const target = { top: 720, left: 70, width: 70, height: 60 }
    const card = spotlightPosition(target, { width: 390, height: 844 }, 300)
    expect(card.top + 300).toBeLessThan(target.top)
    expect(card.left).toBeGreaterThanOrEqual(16)
    expect(card.left + card.width).toBeLessThanOrEqual(374)
  })
  it('places the card alongside desktop controls', () => {
    const card = spotlightPosition({ top: 150, left: 264, width: 200, height: 48 }, { width: 1440, height: 900 }, 300)
    expect(card.left).toBeGreaterThan(464)
    expect(card.top).toBeGreaterThanOrEqual(16)
  })
  it('stays within a short viewport when the highlighted region is large', () => {
    const card = spotlightPosition({ top: 16, left: 16, width: 288, height: 260 }, { width: 320, height: 360 }, 500)
    expect(card.left).toBe(16)
    expect(card.width).toBe(288)
    expect(card.top).toBe(16)
  })
  it('constrains long mobile explanations to the available space beside the target', () => {
    const target = { top: 72, left: 20, width: 280, height: 200 }
    const viewport = { width: 320, height: 568 }
    const height = spotlightCardHeight(target, viewport)
    const card = spotlightPosition(target, viewport, height)
    expect(card.top).toBeGreaterThanOrEqual(target.top + target.height + 18)
    expect(card.top + height).toBeLessThanOrEqual(viewport.height - 16)
  })
})
