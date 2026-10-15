import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import GymPlanEditor from './GymPlanEditor'

afterEach(cleanup)

function addExercise(query: string, buttonName: RegExp) {
  fireEvent.change(screen.getByPlaceholderText('Es. Scheda A · Petto e tricipiti'), { target: { value: 'Scheda A' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Aggiungi esercizio' }))
  fireEvent.change(screen.getByLabelText('Cerca esercizio o attrezzo'), { target: { value: query } })
  fireEvent.click(screen.getByRole('button', { name: buttonName }))
}

describe('GymPlanEditor', () => {
  it('keeps sets blank while replacing 3 with 2 and prevents saving the blank value', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<GymPlanEditor plan={null} onSave={onSave} onCancel={vi.fn()} />)
    addExercise('squat bilanciere', /^SquatBilanciere/)
    const sets = screen.getByLabelText('Serie') as HTMLInputElement
    fireEvent.change(sets, { target: { value: '' } })
    expect(sets.value).toBe('')
    expect((screen.getByRole('button', { name: 'Salva scheda' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Salva scheda' }))
    expect(onSave).not.toHaveBeenCalled()
    fireEvent.change(sets, { target: { value: '2' } })
    expect(sets.value).toBe('2')
    fireEvent.click(screen.getByRole('button', { name: 'Salva scheda' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Scheda A', [expect.objectContaining({ target_sets: 2 })]))
  })

  it('reuses a saved custom exercise while retaining its editable equipment', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<GymPlanEditor plan={null} customExercises={[
      { key: 'custom:1', name: 'Croci su panca', equipment: 'Manubri', muscle: 'Personalizzato', custom: true },
    ]} onSave={onSave} onCancel={vi.fn()} />)
    addExercise('croci manubri', /^Croci su pancaManubri/)
    expect((screen.getByLabelText('Attrezzo') as HTMLInputElement).value).toBe('Manubri')
    fireEvent.click(screen.getByRole('button', { name: 'Salva scheda' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Scheda A', [expect.objectContaining({
      exercise_key: null, exercise_name: 'Croci su panca', equipment: 'Manubri',
    })]))
  })

  it.each([0, 30, -15])('saves an explicit bench angle of %s degrees', async angle => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<GymPlanEditor plan={null} onSave={onSave} onCancel={vi.fn()} />)
    addExercise('panca piana', /^Panca pianaBilanciere/)
    const input = screen.getByLabelText(/Inclinazione panca/) as HTMLInputElement
    fireEvent.change(input, { target: { value: '91' } })
    expect((screen.getByRole('button', { name: 'Salva scheda' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(input, { target: { value: String(angle) } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva scheda' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Scheda A', [expect.objectContaining({ bench_angle: angle })]))
  })

  it('allows opting into a bench for any exercise and clears the angle when deselected', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<GymPlanEditor plan={null} onSave={onSave} onCancel={vi.fn()} />)
    addExercise('curl manubri', /^Curl bicipitiManubri/)
    expect(screen.queryByLabelText(/Inclinazione panca/)).toBeNull()
    fireEvent.click(screen.getByLabelText('Usa una panca'))
    fireEvent.change(screen.getByLabelText(/Inclinazione panca/), { target: { value: '45' } })
    fireEvent.click(screen.getByLabelText('Usa una panca'))
    fireEvent.click(screen.getByRole('button', { name: 'Salva scheda' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Scheda A', [expect.objectContaining({ bench_angle: null })]))
  })

  it('preserves a saved angle when editing and allows clearing it completely', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<GymPlanEditor plan={{
      id: 'plan-1', name: 'Esistente', user_id: 'user-1', position: 0, created_at: '', updated_at: '',
      exercises: [{ id: 'exercise-1', plan_id: 'plan-1', position: 0, exercise_key: null,
        exercise_name: 'Croci', equipment: 'Manubri', target_sets: 3, target_reps: 10,
        target_reps_max: null, per_side: false, bench_angle: 45 }],
    }} onSave={onSave} onCancel={vi.fn()} />)
    const angle = screen.getByLabelText(/Inclinazione panca/) as HTMLInputElement
    expect(angle.value).toBe('45')
    fireEvent.click(screen.getByRole('button', { name: 'Salva scheda' }))
    await waitFor(() => expect(onSave).toHaveBeenLastCalledWith('Esistente', [expect.objectContaining({ bench_angle: 45 })]))
    fireEvent.change(angle, { target: { value: '' } })
    expect(angle.value).toBe('')
    fireEvent.click(screen.getByRole('button', { name: 'Salva scheda' }))
    await waitFor(() => expect(onSave).toHaveBeenLastCalledWith('Esistente', [expect.objectContaining({ bench_angle: null })]))
  })

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
