import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { PreparedBatch } from '../../types'
import PreparedWeightCorrection from './PreparedWeightCorrection'

const mocks = vi.hoisted(() => ({ correctPreparedBatchWeight: vi.fn(), refreshDiary: vi.fn(), showToast: vi.fn() }))
vi.mock('../../services/api', () => mocks)
vi.mock('../../contexts/DataContext', () => ({ useData: () => mocks }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
const batch = { id: 'batch', total_cooked_g: 1206, remaining_g: 506 } as PreparedBatch

function openCorrection(value: string, preparedBatch = batch) {
  const onCorrected = vi.fn()
  const onBusyChange = vi.fn()
  render(<PreparedWeightCorrection batch={preparedBatch} disabled={false} onCorrected={onCorrected} onBusyChange={onBusyChange} />)
  fireEvent.click(screen.getByRole('button', { name: 'Correggi il peso rimasto' }))
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Peso reale rimasto (g)' }), { target: { value } })
  return { onCorrected, onBusyChange }
}

it('previews and saves the corrected total, refreshing historical diary data', async () => {
  mocks.correctPreparedBatchWeight.mockResolvedValue({ total_cooked_g: 1100, remaining_g: 400 })
  const { onCorrected, onBusyChange } = openCorrection('400')
  expect(screen.getByText('Totale preparato corretto: 1100 g')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Salva peso e ricalcola' }))
  await waitFor(() => expect(mocks.refreshDiary).toHaveBeenCalledOnce())
  expect(onCorrected).toHaveBeenCalledWith({ ...batch, total_cooked_g: 1100, remaining_g: 400 })
  expect(onBusyChange.mock.calls).toEqual([[true], [false]])
})

it.each(['', '-1'])('rejects an invalid remainder %s', value => {
  openCorrection(value)
  const save = screen.getByRole('button', { name: 'Salva peso e ricalcola' }) as HTMLButtonElement
  expect(save.disabled).toBe(true)
  fireEvent.click(save)
  expect(mocks.correctPreparedBatchWeight).not.toHaveBeenCalled()
})

it('allows zero after eaten portions but rejects an empty total', () => {
  openCorrection('0')
  expect((screen.getByRole('button', { name: 'Salva peso e ricalcola' }) as HTMLButtonElement).disabled).toBe(false)
  cleanup()
  openCorrection('0', { ...batch, total_cooked_g: 506 })
  expect((screen.getByRole('button', { name: 'Salva peso e ricalcola' }) as HTMLButtonElement).disabled).toBe(true)
})

it('keeps the entered weight after a stale-data rejection and does not report success', async () => {
  mocks.correctPreparedBatchWeight.mockRejectedValue({ code: '40001' })
  const { onCorrected, onBusyChange } = openCorrection('400')
  fireEvent.click(screen.getByRole('button', { name: 'Salva peso e ricalcola' }))
  await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false))
  expect(onCorrected).not.toHaveBeenCalled()
  expect(mocks.refreshDiary).not.toHaveBeenCalled()
  expect(mocks.showToast).toHaveBeenCalledWith(expect.stringContaining('Riaprila'))
  expect((screen.getByRole('spinbutton', { name: 'Peso reale rimasto (g)' }) as HTMLInputElement).value).toBe('400')
})
