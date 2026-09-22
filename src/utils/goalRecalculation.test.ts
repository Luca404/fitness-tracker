import { describe, expect, it } from 'vitest'
import { shouldAutoRecalculateGoals, summarizeRollingWeight } from './goalRecalculation'

describe('automatic goal recalculation', () => {
  it('uses the average of the available measurements in the seven-day window', () => {
    expect(summarizeRollingWeight([
      { weight_kg: 80 }, { weight_kg: 79.5 }, { weight_kg: 79 },
    ])).toEqual({ averageKg: 79.5, sampleCount: 3 })
  })

  it('does not let one isolated measurement change the goals', () => {
    const summary = summarizeRollingWeight([{ weight_kg: 76 }])
    expect(shouldAutoRecalculateGoals(summary, 80)).toBe(false)
  })

  it('recalculates at an absolute change of at least two percent', () => {
    expect(shouldAutoRecalculateGoals({ averageKg: 78.41, sampleCount: 4 }, 80)).toBe(false)
    expect(shouldAutoRecalculateGoals({ averageKg: 78.4, sampleCount: 4 }, 80)).toBe(true)
    expect(shouldAutoRecalculateGoals({ averageKg: 81.6, sampleCount: 4 }, 80)).toBe(true)
  })
})
