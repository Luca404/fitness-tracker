import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import GymPlanEditor from './GymPlanEditor'

describe('GymPlanEditor', () => {
  it('adds an exercise found through its equipment and saves the planned sets and reps', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<GymPlanEditor plan={null} onSave={onSave} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Es. Scheda A · Petto e tricipiti'), { target: { value: 'Scheda A' } })
    fireEvent.click(screen.getByRole('button', { name: '+ Aggiungi esercizio' }))
    fireEvent.change(screen.getByLabelText('Cerca esercizio o attrezzo'), { target: { value: 'manubri rematore' } })
    fireEvent.click(screen.getByRole('button', { name: /^RematoreManubri/ }))
    fireEvent.change(screen.getByLabelText('Serie'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Rip. min'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Rip. max'), { target: { value: '12' } })
    fireEvent.click(screen.getByLabelText('Ripetizioni per lato/gamba'))
    fireEvent.click(screen.getByRole('button', { name: 'Salva scheda' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Scheda A', [expect.objectContaining({
      exercise_key: 'dumbbell-row', equipment: 'Manubri', target_sets: 4,
      target_reps: 8, target_reps_max: 12, per_side: true,
    })]))
  })
})
