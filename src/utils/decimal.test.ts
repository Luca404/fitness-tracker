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
