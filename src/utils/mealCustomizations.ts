export function splitMealItems<T extends { is_customization?: boolean | null }>(items: T[]) {
  return {
    baseItems: items.filter(item => !item.is_customization),
    addedItems: items.filter(item => item.is_customization),
  }
}
