import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import OpenFoodFactsDetails from './OpenFoodFactsDetails'

describe('OpenFoodFactsDetails', () => {
  afterEach(cleanup)

  const food = {
    carbs_100g: 65, sugars_100g: 22, fat_100g: 20,
    saturated_fat_100g: 8.5, unsaturated_fat_100g: 11.5,
  }

  it('uses concise labels outside dish entry', () => {
    render(<OpenFoodFactsDetails food={food} />)

    const carbsGroup = screen.getByText(/Carboidrati/).parentElement
    const fatGroup = screen.getByText(/Grassi/).parentElement
    expect(carbsGroup?.textContent).toContain('Carboidrati 65 g')
    expect(carbsGroup?.textContent).toContain('Zuccheri 22 g')
    expect(fatGroup?.textContent).toContain('Grassi 20 g')
    expect(fatGroup?.textContent).toContain('di cui saturi 8.5 g')
    expect(fatGroup?.textContent).toContain('di cui insaturi 11.5 g')
  })

  it('keeps detailed labels during dish entry', () => {
    render(<OpenFoodFactsDetails food={food} detailedLabels />)
    expect(screen.getByText(/Carboidrati totali/).parentElement?.textContent).toContain('di cui zuccheri 22 g')
    expect(screen.getByText(/Grassi totali/)).toBeTruthy()
  })
})
