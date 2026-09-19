import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import IngredientQuantityInput from './IngredientQuantityInput'

function BreadQuantityHarness() {
  const [grams, setGrams] = useState(100)
  return (
    <>
      <IngredientQuantityInput
        foodName="Pane in cassetta"
        category="bakery"
        grams={grams}
        onChange={setGrams}
      />
      <output aria-label="Grammi calcolati">{grams}</output>
    </>
  )
}

describe('IngredientQuantityInput', () => {
  it('converts slices to grams while keeping grams as source of truth', () => {
    render(<BreadQuantityHarness />)

    fireEvent.change(screen.getByLabelText('Unità per Pane in cassetta'), {
      target: { value: 'slice' },
    })
    expect(screen.getByLabelText('Grammi calcolati').textContent).toBe('30')

    fireEvent.change(screen.getByLabelText('Quantità di Pane in cassetta'), {
      target: { value: '2' },
    })
    expect(screen.getByLabelText('Grammi calcolati').textContent).toBe('60')
    expect(screen.getByText('≈ 60 g · 1 fetta ≈ 30 g')).toBeTruthy()
  })
})
