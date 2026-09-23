import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import OpenFoodFactsDetails from './OpenFoodFactsDetails'

describe('OpenFoodFactsDetails', () => {
  afterEach(cleanup)

  it('shows sugars and saturated fat as parts of their totals', () => {
    render(<OpenFoodFactsDetails food={{
      carbs_100g: 65, sugars_100g: 22, fat_100g: 20,
      saturated_fat_100g: 8.5, unsaturated_fat_100g: 11.5,
    }} />)

    const carbsGroup = screen.getByText(/Carboidrati totali/).parentElement
    const fatGroup = screen.getByText(/Grassi totali/).parentElement
    expect(carbsGroup?.textContent).toContain('Carboidrati totali 65 g')
    expect(carbsGroup?.textContent).toContain('di cui zuccheri 22 g')
    expect(fatGroup?.textContent).toContain('Grassi totali 20 g')
    expect(fatGroup?.textContent).toContain('di cui saturi 8.5 g')
    expect(fatGroup?.textContent).toContain('di cui insaturi 11.5 g')
  })
})
