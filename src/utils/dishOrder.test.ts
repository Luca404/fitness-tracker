import { describe, expect, it } from 'vitest'
import { orderDishItems } from './dishOrder'
import { getDishIcon } from './foodIcons'

describe('saved dish order and icon', () => {
  it('restores ingredient insertion order even when the database returns another order', () => {
    const items = [
      { id: 'third', position: 2, category: 'vegetable' as const },
      { id: 'first', position: 0, category: 'grain' as const },
      { id: 'second', position: 1, category: 'sauce' as const },
    ]

    const ordered = orderDishItems(items)
    expect(ordered.map(item => item.id)).toEqual(['first', 'second', 'third'])
    expect(items[0].id).toBe('third')
    expect(getDishIcon({ icon: null, items: ordered })).toBe('🍚')
  })

  it('uses a custom icon until automatic mode is restored', () => {
    const items = [{ id: 'first', position: 0, category: 'grain' as const }]
    expect(getDishIcon({ icon: '🍝', items })).toBe('🍝')
    expect(getDishIcon({ icon: null, items })).toBe('🍚')
  })
})
