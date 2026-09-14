import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MealEntryCard from './MealEntryCard'

describe('MealEntryCard', () => {
  it('shows the eaten dish summary without exposing its ingredients', () => {
    const onOpen = vi.fn()
    render(
      <MealEntryCard
        entry={{
          id: 'entry-1',
          meal_id: 'meal-1',
          name: 'Bowl pollo e riso',
          created_at: '',
          items: [
            {
              id: 'item-1', meal_id: 'meal-1', entry_id: 'entry-1', food_name: 'Riso basmati',
              quantity_g: 100, unit: 'g', calories: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3,
              source: 'basic', off_food_id: null, category: 'grain', food_key: 'basic:riso-basmati-cotto', created_at: '',
            },
            {
              id: 'item-2', meal_id: 'meal-1', entry_id: 'entry-1', food_name: 'Acqua naturale',
              quantity_g: 500, unit: 'ml', calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0,
              source: 'basic', off_food_id: null, category: 'beverage', food_key: 'basic:acqua-naturale', created_at: '',
            },
          ],
        }}
        onOpen={onOpen}
      />
    )

    const card = screen.getByRole('button', { name: /Bowl pollo e riso/i })
    expect(screen.queryByText('Riso basmati')).toBeNull()
    expect(screen.queryByText('Acqua naturale')).toBeNull()
    expect(screen.getByText('130 kcal')).toBeTruthy()
    expect(screen.getByText(/100 g \+ 500 ml/)).toBeTruthy()
    fireEvent.click(card)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
