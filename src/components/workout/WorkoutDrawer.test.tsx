import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WorkoutDrawer from './WorkoutDrawer'

afterEach(cleanup)

describe('workout registration', () => {
  it('saves optional distance and pace-adjusted calories', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<WorkoutDrawer activityKey="walking" weightKg={80} onSave={onSave} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('Durata (minuti)'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Distanza (km, facoltativa)'), { target: { value: '5' } })
    expect(screen.queryByText(/Velocità media|Con i km/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Salva workout' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      activity: 'walking', duration_min: 60, calories_burned: 304, distance_km: 5,
    }))
  })

  it('updates the calorie preview and saved estimate for a treadmill incline', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<WorkoutDrawer activityKey="treadmill" weightKg={80} onSave={onSave} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('Durata (minuti)'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Distanza (km, facoltativa)'), { target: { value: '5' } })
    expect(screen.getByText('304 kcal')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Inclinazione (%, facoltativa)'), { target: { value: '6' } })
    expect(screen.getByText('425 kcal')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Salva workout' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      activity: 'treadmill', duration_min: 60, calories_burned: 425, distance_km: 5, incline_pct: 6,
    }))
  })

  it('allows duration-only workouts and resets distance between activities', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { rerender } = render(<WorkoutDrawer activityKey="walking" weightKg={80} onSave={onSave} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Salva workout' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      activity: 'walking', duration_min: 30, calories_burned: 140, distance_km: null,
    }))
    fireEvent.change(screen.getByLabelText('Distanza (km, facoltativa)'), { target: { value: '2' } })
    rerender(<WorkoutDrawer activityKey="swimming" weightKg={80} onSave={onSave} onClose={() => {}} />)
    expect(screen.queryByLabelText('Distanza (km, facoltativa)')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Salva workout' }))
    await waitFor(() => expect(onSave).toHaveBeenLastCalledWith({
      activity: 'swimming', duration_min: 30, calories_burned: 320, distance_km: null,
    }))
  })

  it('accepts zero treadmill incline and validates rowing cadence separately', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { rerender } = render(<WorkoutDrawer activityKey="treadmill" weightKg={80} onSave={onSave} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('Inclinazione (%, facoltativa)'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva workout' }))
    await waitFor(() => expect(onSave).toHaveBeenLastCalledWith({
      activity: 'treadmill', duration_min: 30, calories_burned: 232, distance_km: null, incline_pct: 0,
    }))

    rerender(<WorkoutDrawer activityKey="rowing_machine" weightKg={80} onSave={onSave} onClose={() => {}} />)
    expect(screen.queryByLabelText('Inclinazione (%, facoltativa)')).toBeNull()
    const cadence = screen.getByLabelText<HTMLInputElement>('Cadenza (colpi/min, facoltativa)')
    expect(cadence.value).toBe('')
    fireEvent.change(cadence, { target: { value: '0' } })
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Salva workout' }).disabled).toBe(true)
    fireEvent.change(cadence, { target: { value: '26,5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva workout' }))
    await waitFor(() => expect(onSave).toHaveBeenLastCalledWith({
      activity: 'rowing_machine', duration_min: 30, calories_burned: 200, distance_km: null, stroke_rate_spm: 26.5,
    }))
  })

  it('blocks invalid inputs and keeps values after a failed save', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('offline'))
    render(<WorkoutDrawer activityKey="walking" weightKg={80} onSave={onSave} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('Distanza (km, facoltativa)'), { target: { value: '-2' } })
    expect(screen.getByRole('alert').textContent).toMatch(/distanza valida/)
    expect((screen.getByRole('button', { name: 'Salva workout' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Distanza (km, facoltativa)'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Durata (minuti)'), { target: { value: '30.5' } })
    expect((screen.getByRole('button', { name: 'Salva workout' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Durata (minuti)'), { target: { value: '45' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva workout' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect((screen.getByLabelText('Durata (minuti)') as HTMLInputElement).value).toBe('45')
  })
})
