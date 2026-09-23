import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import StepObjective from './StepObjective'
import type { Objective } from '../../types'

function ObjectiveHarness({ onNext }: { onNext: () => void }) {
  const [data, setData] = useState<{ objective: Objective; target_weight_kg: number | null; target_date: string | null }>({
    objective: 'lose_weight',
    target_weight_kg: 70,
    target_date: '2027-01-01',
  })
  return (
    <>
      <StepObjective data={data} currentWeightKg={80} onChange={setData} onNext={onNext} onBack={() => {}} />
      <output aria-label="Obiettivo selezionato">{JSON.stringify(data)}</output>
    </>
  )
}

describe('StepObjective', () => {
  afterEach(cleanup)

  it('allows recomposition without target weight or date and clears previous loss targets', () => {
    const onNext = vi.fn()
    render(<ObjectiveHarness onNext={onNext} />)

    fireEvent.click(screen.getByRole('button', { name: /Ricomposizione corporea/ }))

    expect(screen.queryByText(/Peso target/)).toBeNull()
    expect(screen.queryByText(/Entro quando/)).toBeNull()
    expect(JSON.parse(screen.getByLabelText('Obiettivo selezionato').textContent ?? '{}')).toEqual({
      objective: 'recomposition', target_weight_kg: null, target_date: null,
    })
    fireEvent.click(screen.getByRole('button', { name: /Continua/ }))
    expect(onNext).toHaveBeenCalledOnce()
  })
})
