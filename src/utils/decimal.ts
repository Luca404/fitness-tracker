/** Round user-facing measurements to at most two decimal places. */
export function roundToTwo(value: number): number {
  if (!Number.isFinite(value)) return value
  const rounded = Math.round((Math.abs(value) + Number.EPSILON) * 100) / 100
  return rounded === 0 ? 0 : Math.sign(value) * rounded
}

export function formatDecimal(value: number): string {
  return String(roundToTwo(value))
}
