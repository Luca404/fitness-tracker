import { beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }))
vi.mock('./supabase', () => ({ supabase: mock }))
import { createDish, getDishes, updateDish } from './api'
function query(data: unknown) {
  const q = { select: () => q, eq: () => q, in: () => q, order: () => q,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve) }
  return q
}
beforeEach(() => {
  vi.clearAllMocks()
  mock.rpc.mockResolvedValue({ data: {}, error: null })
  mock.from.mockImplementation(table => query(table === 'dishes' ? [{ id: 'recipe', name: 'Pasta', categories: ['pasta'] }] : []))
})
describe('saved recipe categories and usage API', () => {
  it('writes secondary categories atomically with the recipe', async () => {
    await createDish('user', 'Pasta', [], ['lunch'], ['pasta', 'vegetables'])
    expect(mock.rpc).toHaveBeenCalledWith('create_dish_with_categories', {
      p_user_id: 'user', p_name: 'Pasta', p_items: [], p_meal_types: ['lunch'], p_categories: ['pasta', 'vegetables'],
    })
    await updateDish('recipe', 'Pasta', [], ['lunch'], [])
    expect(mock.rpc).toHaveBeenLastCalledWith('update_dish_with_categories', {
      p_dish_id: 'recipe', p_name: 'Pasta', p_items: [], p_meal_types: ['lunch'], p_categories: [],
    })
  })
  it('does not clear categories when an older caller only edits the recipe', async () => {
    await updateDish('recipe', 'Pasta', [], ['lunch'])
    expect(mock.rpc).toHaveBeenCalledWith('update_dish_with_categories', {
      p_dish_id: 'recipe', p_name: 'Pasta', p_items: [], p_meal_types: ['lunch'],
    })
  })
  it('hydrates usage only for the picker and sends no user or score parameters', async () => {
    const plain = await getDishes()
    expect(plain[0].categories).toEqual(['pasta'])
    expect(mock.rpc).not.toHaveBeenCalled()
    mock.rpc.mockResolvedValue({ data: [{ dish_id: 'recipe', recent_use_count: '7', last_used_on: '2026-11-05' }], error: null })
    expect((await getDishes({ recentUsage: true }))[0]).toMatchObject({ recent_use_count: 7, last_used_on: '2026-11-05' })
    expect(mock.rpc).toHaveBeenCalledWith('get_recent_dish_usage')
  })
})
