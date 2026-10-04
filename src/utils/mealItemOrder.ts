/** Keep the recorded order; records without positions retain their input order. */
export function orderMealItems<T extends { position?: number }>(items: T[]): T[] {
  return [...items].sort((left, right) => (left.position ?? Number.MAX_SAFE_INTEGER) - (right.position ?? Number.MAX_SAFE_INTEGER))
}
