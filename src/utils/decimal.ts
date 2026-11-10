function roundToPlaces(value: number, places: number): number {
  if (!Number.isFinite(value)) return value
  const factor = 10 ** places
  const rounded = Math.round((Math.abs(value) + Number.EPSILON) * factor) / factor
  return rounded === 0 ? 0 : Math.sign(value) * rounded
}

/** Keep two decimal places for stored measurements and nutrition calculations. */
export function roundToTwo(value: number): number {
  return roundToPlaces(value, 2)
}

/** Display at most one decimal place, or whole numbers in overviews. */
export function formatDecimal(value: number, places = 1, separator: '.' | ',' = '.'): string {
  return String(roundToPlaces(value, places)).replace('.', separator)
}

/** Editable measurements retain the two supported decimal places. */
export function formatInputDecimal(value: number): string {
  return String(roundToTwo(value))
}
