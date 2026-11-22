import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { askFitnessChat } from '../../services/fitnessChat'
import FitnessChat from './FitnessChat'

vi.mock('../../services/fitnessChat', () => ({
  askFitnessChat: vi.fn(),
  confirmFitnessChatMeal: vi.fn(),
}))

afterEach(cleanup)

it('renders emphasis in assistant replies and displays the rest as text', async () => {
  vi.mocked(askFitnessChat).mockResolvedValue({
    reply: 'Hai registrato **112 g di proteine**.\n**4 giorni su 7**. <img src="invalid">',
  })
  render(<FitnessChat />)
  fireEvent.click(screen.getByRole('button', { name: 'Apri chat con Sagebite' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Messaggio' }), { target: { value: 'Quanto ho registrato? **proteine**' } })
  fireEvent.click(screen.getByRole('button', { name: 'Invia messaggio' }))

  const log = within(screen.getByRole('log', { name: 'Conversazione' }))
  const amount = await log.findByText('112 g di proteine', { selector: 'strong' })
  expect(log.getByText('4 giorni su 7', { selector: 'strong' })).toBeTruthy()
  expect(amount.parentElement?.textContent).toBe('Hai registrato 112 g di proteine.\n4 giorni su 7. <img src="invalid">')
  expect(log.getByText('Quanto ho registrato? **proteine**')).toBeTruthy()
  expect(log.queryByRole('img')).toBeNull()
})
