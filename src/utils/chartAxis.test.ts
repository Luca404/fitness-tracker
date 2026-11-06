import { describe, expect, it } from 'vitest'
import { buildChartAxis } from './chartAxis'

describe('readable chart axes', () => {
  it('keeps weight values and a distant target inside evenly spaced bounds', () => {
    const values = [74.1, 74.8, 75.3, 70]
    const axis = buildChartAxis(values)
    expect(axis.domain[0]).toBeLessThanOrEqual(70)
    expect(axis.domain[1]).toBeGreaterThanOrEqual(75.3)
    const step = axis.ticks[1] - axis.ticks[0]
    expect(axis.ticks.length).toBeGreaterThanOrEqual(6)
    axis.ticks.slice(1).forEach((tick, i) => expect(tick - axis.ticks[i]).toBeCloseTo(step))
    expect(new Set(axis.ticks.map(tick => tick.toFixed(1))).size).toBe(axis.ticks.length)
  })
  it('uses more labels on a taller plot while keeping calorie ticks whole and zero-based', () => {
    const values = [320, 1800, 2370]
    const mobile = buildChartAxis(values, { minimumStep: 1, includeZero: true, reservedHeight: 68 })
    const desktop = buildChartAxis(values, { height: 320, minimumStep: 1, includeZero: true, reservedHeight: 68 })
    expect(mobile.domain[0]).toBe(0)
    expect(mobile.domain[1]).toBeGreaterThanOrEqual(2370)
    expect(desktop.ticks.length).toBeGreaterThan(mobile.ticks.length)
    expect(desktop.ticks.every(Number.isInteger)).toBe(true)
  })
  it('never invents fractional repetitions and fits the available height', () => {
    const axis = buildChartAxis([8, 10, 12], { minimumStep: 1 })
    expect(axis.ticks.every(Number.isInteger)).toBe(true)
    expect(axis.ticks.length).toBeLessThanOrEqual(8)
  })
  it('keeps calorie axes at zero even when padding exceeds the lowest value', () => {
    for (const values of [[0, 2500], [10, 4500], [null, 0], []]) {
      for (const height of [200, 320]) {
        const axis = buildChartAxis(values, { height, minimumStep: 1, includeZero: true, reservedHeight: 68 })
        expect(axis.domain[0]).toBe(0)
        expect(axis.ticks[0]).toBe(0)
        expect(axis.ticks.every(tick => tick >= 0)).toBe(true)
      }
    }
  })
  it('handles flat, empty, zero and missing series without invalid or duplicate ticks', () => {
    for (const values of [[75, 75], [0, 0], [], [null, undefined, NaN, Infinity]]) {
      const axis = buildChartAxis(values)
      expect(axis.domain[1]).toBeGreaterThan(axis.domain[0])
      expect(axis.ticks.every(Number.isFinite)).toBe(true)
      expect(new Set(axis.ticks).size).toBe(axis.ticks.length)
    }
  })
})
