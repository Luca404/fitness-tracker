import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BeveragePicker from './BeveragePicker'
afterEach(cleanup)

describe('beverage registration', () => {
  it('registers the entered volume and strength with updated calories', async () => {
    const onAddEntry = vi.fn().mockResolvedValue(undefined)
    render(<BeveragePicker onAddEntry={onAddEntry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Birra chiara' }))
    fireEvent.change(screen.getByLabelText('Quantità (ml)'), { target: { value: '500' } })
    fireEvent.change(screen.getByLabelText('Gradazione (% vol)'), { target: { value: '6' } })
    expect(screen.getByText(/≈ 2 UA/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Registra 242.6 kcal' }))
    await waitFor(() => expect(onAddEntry).toHaveBeenCalledWith('Birra chiara', [expect.objectContaining({
      quantity_g: 500, unit: 'ml', alcohol_abv: 6, calories: 242.62, food_key: 'basic:birra-chiara',
    })]))
  })
  it('keeps popular cocktails distinct and filters the catalog', () => {
    render(<BeveragePicker onAddEntry={vi.fn()} />)
    for (const name of ['Aperol Spritz', 'Campari Spritz', 'Negroni', 'Negroni Sbagliato', 'Gin Tonic', 'Cuba Libre', 'Mojito']) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
    fireEvent.change(screen.getByLabelText('Cerca bevanda'), { target: { value: 'spritz' } })
    expect(screen.queryByRole('button', { name: 'Birra chiara' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Aperol Spritz' }))
    expect((screen.getByLabelText('Quantità (ml)') as HTMLInputElement).value).toBe('180')
    expect(screen.getByText(/volume senza ghiaccio/)).toBeTruthy()
  })
  it('blocks invalid amounts and strength, and accepts alcohol-free strength', async () => {
    const onAddEntry = vi.fn().mockResolvedValue(undefined)
    render(<BeveragePicker onAddEntry={onAddEntry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Vino rosso' }))
    for (const value of ['', '-1', '101']) {
      fireEvent.change(screen.getByLabelText('Gradazione (% vol)'), { target: { value } })
      expect((screen.getByRole('button', { name: /Registra .* kcal/ }) as HTMLButtonElement).disabled).toBe(true)
    }
    fireEvent.change(screen.getByLabelText('Gradazione (% vol)'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Quantità (ml)'), { target: { value: '' } })
    expect((screen.getByRole('button', { name: /Registra .* kcal/ }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Quantità (ml)'), { target: { value: '125' } })
    fireEvent.click(screen.getByRole('button', { name: /Registra .* kcal/ }))
    await waitFor(() => expect(onAddEntry).toHaveBeenCalledWith('Vino rosso', [expect.objectContaining({ alcohol_abv: 0 })]))
  })
  it('prevents duplicate saves and retains the entered drink after a failure', async () => {
    let reject!: (error: Error) => void
    const onAddEntry = vi.fn().mockImplementationOnce(() => new Promise<void>((_resolve, fail) => { reject = fail }))
      .mockResolvedValue(undefined)
    render(<BeveragePicker onAddEntry={onAddEntry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Gin Tonic' }))
    const save = screen.getByRole('button', { name: /Registra .* kcal/ })
    fireEvent.click(save); fireEvent.click(save)
    expect(onAddEntry).toHaveBeenCalledTimes(1)
    await act(async () => reject(new Error('offline')))
    expect(await screen.findByText(/Impossibile registrare/)).toBeTruthy()
    expect((screen.getByLabelText('Quantità (ml)') as HTMLInputElement).value).toBe('200')
    fireEvent.click(screen.getByRole('button', { name: /Registra .* kcal/ }))
    await waitFor(() => expect(onAddEntry).toHaveBeenCalledTimes(2))
  })
})
