import { describe, expect, it } from 'vitest'
import { formatDecimal, roundToTwo } from './decimal'

describe('two-decimal measurements', () => {
  it('rounds positive and negative values without padding whole numbers', () => {
    expect(roundToTwo(12.345)).toBe(12.35)
    expect(roundToTwo(-12.345)).toBe(-12.35)
    expect(formatDecimal(12)).toBe('12')
    expect(formatDecimal(1.999)).toBe('2')
  })
})

describe('display formatting', () => {
  it('uses at most one decimal in details', () => {
    expect(formatDecimal(12.345)).toBe('12.3')
    expect(formatDecimal(12.35)).toBe('12.4')
    expect(formatDecimal(-12.35)).toBe('-12.4')
    expect(formatDecimal(1.95)).toBe('2')
    expect(formatDecimal(-0.01)).toBe('0')
  })

  it('rounds overview totals directly to whole numbers', () => {
    expect(formatDecimal(1234.49, 0)).toBe('1234')
    expect(formatDecimal(1234.5, 0)).toBe('1235')
    expect(formatDecimal(42.99, 0)).toBe('43')
    expect(formatDecimal(-0.01, 0)).toBe('0')
  })
})
