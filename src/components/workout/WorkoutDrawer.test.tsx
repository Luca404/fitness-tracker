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
    expect(screen.getByText('Velocità media: 5 km/h')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Salva workout' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('walking', 60, 304, 5))
  })

  it('allows duration-only workouts and resets distance between activities', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { rerender } = render(<WorkoutDrawer activityKey="walking" weightKg={80} onSave={onSave} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Salva workout' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('walking', 30, 140, null))
    fireEvent.change(screen.getByLabelText('Distanza (km, facoltativa)'), { target: { value: '2' } })
    rerender(<WorkoutDrawer activityKey="weights" weightKg={80} onSave={onSave} onClose={() => {}} />)
    expect(screen.queryByLabelText('Distanza (km, facoltativa)')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Salva workout' }))
    await waitFor(() => expect(onSave).toHaveBeenLastCalledWith('weights', 30, 200, null))
  })

  it('blocks invalid inputs and keeps values after a failed save', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('offline'))
    render(<WorkoutDrawer activityKey="walking" weightKg={80} onSave={onSave} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('Distanza (km, facoltativa)'), { target: { value: '-2' } })
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
