import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import IngredientQuantityInput from './IngredientQuantityInput'
import type { PieceSize } from '../../types'

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

function AppleQuantityHarness() {
  const [grams, setGrams] = useState(100)
  const [piece, setPiece] = useState<{ size: PieceSize; count: number } | null>(null)
  return (
    <>
      <IngredientQuantityInput foodName="Mela" category="fruit" grams={grams} onChange={setGrams}
        pieceSize={piece?.size} pieceCount={piece?.count} onPieceChange={setPiece} />
      <output aria-label="Grammi calcolati">{grams}</output>
      <output aria-label="Pezzi calcolati">{piece ? `${piece.count}:${piece.size}` : 'nessuno'}</output>
    </>
  )
}

describe('IngredientQuantityInput', () => {
  afterEach(cleanup)

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

  it('allows the quantity field to be emptied before entering a new value', () => {
    render(<BreadQuantityHarness />)
    const input = screen.getByLabelText('Quantità di Pane in cassetta')

    fireEvent.change(input, { target: { value: '' } })
    expect((input as HTMLInputElement).value).toBe('')

    fireEvent.change(input, { target: { value: '150' } })
    expect(screen.getByLabelText('Grammi calcolati').textContent).toBe('150')
  })

  it('keeps piece size and count alongside estimated grams', () => {
    render(<AppleQuantityHarness />)
    fireEvent.change(screen.getByLabelText('Unità per Mela'), { target: { value: 'small' } })
    expect(screen.getByLabelText('Grammi calcolati').textContent).toBe('110')
    expect(screen.getByLabelText('Pezzi calcolati').textContent).toBe('1:small')

    fireEvent.change(screen.getByLabelText('Quantità di Mela'), { target: { value: '2' } })
    expect(screen.getByLabelText('Grammi calcolati').textContent).toBe('220')
    expect(screen.getByLabelText('Pezzi calcolati').textContent).toBe('2:small')

    fireEvent.change(screen.getByLabelText('Unità per Mela'), { target: { value: 'grams' } })
    expect(screen.getByLabelText('Pezzi calcolati').textContent).toBe('nessuno')
  })
})
