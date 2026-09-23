export function orderDishItems<T extends { position: number; id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
}
