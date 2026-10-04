import { beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('./supabase', () => ({ supabase: { from: mock.from } }))
import { getMealsForDate, getMealsForRange, getPreparedBatches } from './api'

const baseMeal = { id: 'meal', date: '2026-10-04', meal_type: 'lunch', user_id: 'user', name: null, created_at: '' }
const batch = { id: 'batch', source_dish_id: 'original', snapshot_dish_id: 'snapshot', remaining_g: 200 }
let tables: Record<string, unknown[]>
let queries: Record<string, Record<string, ReturnType<typeof vi.fn>>>
beforeEach(() => {
  vi.clearAllMocks()
  tables = { meals: [baseMeal], meal_entries: [
    { id: 'prepared-entry', meal_id: 'meal', dish_id: 'snapshot', prepared_batch_id: 'batch' },
    { id: 'saved-entry', meal_id: 'meal', dish_id: 'original' },
  ], meal_items: [{ id: 'item-1', entry_id: 'prepared-entry', food_name: 'Riso' }],
  prepared_batches: [batch], dishes: [{ id: 'snapshot', icon: '🍚' }, { id: 'original', icon: '🍝' }], dish_items: [] }
  queries = {}
  mock.from.mockImplementation((table: string) => {
    const result = Promise.resolve({ data: tables[table] ?? [], error: null })
    const chain = { then: result.then.bind(result) } as Record<string, unknown>
    queries[table] = {}
    for (const method of ['select', 'eq', 'in', 'order', 'gte', 'lte', 'is', 'gt']) {
      const fn = vi.fn(() => chain)
      chain[method] = fn
      queries[table][method] = fn
    }
    return chain
  })
})
describe('diary dish icons', () => {
  it('preserves the first legacy catalog match when normalized names collide', async () => {
    tables.meal_items = [{ id: 'legacy', entry_id: 'prepared-entry', food_name: 'Prosciutto', category: 'other', food_key: null }]
    const item = (await getMealsForDate('2026-10-04'))[0].entries[0].items[0]
    expect(item.food_key).toBe('basic:prosciutto-crudo')
    expect(item.category).toBe('meat')
  })
  it('uses the original icon for saved dishes and prepared portions, including closed batches', async () => {
    const meals = await getMealsForDate('2026-10-04')
    expect(meals[0].entries.map(entry => entry.dish_icon)).toEqual(['🍝', '🍝'])
    expect(meals[0].entries[0].dish_icon_source_id).toBe('original')
    expect(meals[0].entries[0].items).toHaveLength(1)
    expect(meals[0].entries[1].items).toEqual([])
    // Daily hydration must not filter out closed prepared batches.
    expect(queries.prepared_batches.is).not.toHaveBeenCalled()
  })
  it('respects removing a custom icon instead of restoring the old snapshot icon', async () => {
    tables.dishes = [{ id: 'snapshot', icon: '🍚' }, { id: 'original', icon: null }]
    expect((await getMealsForDate('2026-10-04'))[0].entries[0].dish_icon).toBeNull()
    expect((await getPreparedBatches())[0].dish.icon).toBeNull()
  })
  it('uses the snapshot when the original dish was deleted', async () => {
    tables.dishes = [{ id: 'snapshot', icon: '🍚' }]
    const entry = (await getMealsForDate('2026-10-04'))[0].entries[0]
    expect(entry.dish_icon).toBe('🍚')
    expect(entry.dish_icon_source_id).toBe('snapshot')
    expect((await getPreparedBatches())[0].dish.icon).toBe('🍚')
  })
  it('uses the current original icon for prepared portions offered in the meal picker', async () => {
    expect((await getPreparedBatches())[0].dish.icon).toBe('🍝')
  })
  it('hydrates weekly items without requesting icons or batch metadata', async () => {
    const meals = await getMealsForRange('2026-09-28', '2026-10-04')
    expect(meals[0].entries[0].items).toHaveLength(1)
    expect(mock.from.mock.calls.map(([table]) => table)).toEqual(['meals', 'meal_entries', 'meal_items'])
  })
})
