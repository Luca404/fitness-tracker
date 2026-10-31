import { describe, expect, it } from 'vitest'
import { createTutorialStore } from './tutorialStore'
import { exampleDishItems } from './tutorialExamples'
import { pantryValues } from '../../utils/pantryDraft'
import { exampleIngredient } from './tutorialExamples'

describe('isolated tutorial store', () => {
  it('keeps catalog saves local and does not create consumed meals when a recipe is saved', async () => {
    const demo = createTutorialStore('2026-10-31')
    await demo.services.api.addPantryItem({ user_id: 'real-user', ...pantryValues(exampleIngredient) })
    await demo.services.api.createDish('real-user', 'Riso con zucchine', exampleDishItems, ['lunch', 'dinner'])
    expect(demo.getSnapshot().pantry[0].user_id).toBe('tutorial-user')
    expect(demo.getSnapshot().dishes).toHaveLength(1)
    expect(demo.getSnapshot().meals).toEqual([])
    expect(createTutorialStore('2026-10-31').getSnapshot().pantry).toEqual([])
  })

  it('preserves the remainder and only logs the portion actually consumed', async () => {
    const demo = createTutorialStore('2026-10-31')
    await demo.services.api.createPreparedBatch({ userId: 'real-user', name: 'Riso con zucchine',
      items: exampleDishItems, sourceDishId: 'tutorial-dish', icon: null,
      totalCookedG: 800, firstPortionG: 0, date: '2026-10-31', mealType: 'lunch' })
    expect(demo.getSnapshot().meals).toEqual([])
    await demo.services.api.consumePreparedBatch('tutorial-batch', '2026-10-31', 'lunch', 200)
    expect(demo.getSnapshot().batches[0].remaining_g).toBe(600)
    const entry = demo.getSnapshot().meals[0].entries[0]
    expect(entry.cooked_portion_g).toBe(200)
    expect(entry.items[0].calories).toBe(140)
    // Going back and repeating a demonstration replaces the example, rather than duplicating it.
    await demo.services.api.consumePreparedBatch('tutorial-batch', '2026-10-31', 'lunch', 200)
    expect(demo.getSnapshot().batches[0].remaining_g).toBe(600)
    expect(demo.getSnapshot().meals[0].entries).toHaveLength(1)
  })

  it('fails closed for unsupported operations instead of calling the production service', async () => {
    const demo = createTutorialStore('2026-10-31')
    await expect(demo.services.api.deletePantryItem('real-id')).rejects.toThrow('dimostrazione')
    await expect(demo.services.gym.deleteGymPlan('real-id')).rejects.toThrow('dimostrazione')
  })
})
