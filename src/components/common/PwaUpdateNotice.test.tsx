import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ needRefresh: true, setNeedRefresh: vi.fn(), update: vi.fn() }))
vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: () => ({ needRefresh: [mock.needRefresh, mock.setNeedRefresh], updateServiceWorker: mock.update }) }))
import PwaUpdateNotice from './PwaUpdateNotice'
afterEach(cleanup)
beforeEach(() => { vi.resetAllMocks(); mock.needRefresh = true; mock.update.mockResolvedValue(undefined) })
it('waits for the user to apply an update and requests a coherent reload', async () => {
  render(<PwaUpdateNotice />)
  expect(mock.update).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Aggiorna' }))
  expect(mock.update).toHaveBeenCalledWith(true)
})
it('allows postponing an update without activating the new worker', () => {
  render(<PwaUpdateNotice />)
  fireEvent.click(screen.getByRole('button', { name: 'Più tardi' }))
  expect(mock.setNeedRefresh).toHaveBeenCalledWith(false)
  expect(mock.update).not.toHaveBeenCalled()
})
it('keeps the update action available after a failure', async () => {
  mock.update.mockRejectedValue(new Error('offline'))
  render(<PwaUpdateNotice />)
  fireEvent.click(screen.getByRole('button', { name: 'Aggiorna' }))
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Aggiornamento non riuscito'))
  expect(screen.getByRole('button', { name: 'Aggiorna' })).toBeTruthy()
})
