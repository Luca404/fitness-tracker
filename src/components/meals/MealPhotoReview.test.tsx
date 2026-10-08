import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { DishItemDraft } from '../../types'
import MealPhotoReview from './MealPhotoReview'

vi.mock('./FoodSearch', () => ({ default: ({ onAdd }: { onAdd: (item: DishItemDraft) => void }) => <button onClick={() => onAdd({
  food_name: 'Pane', quantity_g: 40, calories: 100, protein_g: 3, carbs_g: 20, fat_g: 1,
  category: 'bakery', source: 'pantry', pantry_item_id: 'pantry-1', food_key: 'pantry:pantry-1', off_food_id: null,
})}>Seleziona pane</button> }))

const pasta: DishItemDraft = {
  food_name: 'Pasta cotta', quantity_g: 200, unit: 'g', category: 'grain',
  calories: 300, protein_g: 10, carbs_g: 60, fat_g: 2,
  fiber_g: null, sugars_g: null, salt_g: null,
  source: 'ai_meal_photo', pantry_item_id: null, food_key: null, off_food_id: null,
}
afterEach(cleanup)

function setup(props: Partial<Parameters<typeof MealPhotoReview>[0]> = {}) {
  const onSave = vi.fn().mockResolvedValue(undefined)
  render(<MealPhotoReview initialName="Pasta al pomodoro" initialItems={[pasta]} onCancel={() => {}} onSave={onSave} {...props} />)
  return props.onSave ?? onSave
}

describe('meal photo review', () => {
  it('starts with closed details and scales the eaten share exactly once', async () => {
    const onSave = setup()
    expect(document.querySelector('details')?.open).toBe(false)
    expect(screen.getByText('≈ 300')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Metà' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registra nel diario' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Pasta al pomodoro', [expect.objectContaining({
      quantity_g: 100, calories: 150, carbs_g: 30, source: 'ai_meal_photo', fiber_g: null,
    })]))
  })

  it('combines weight and manual macro corrections before applying a custom percentage', async () => {
    const onSave = setup()
    fireEvent.change(screen.getByLabelText('Quantità ingrediente 1 (g)'), { target: { value: '100' } })
    expect((screen.getByLabelText('Calorie (kcal) ingrediente 1') as HTMLInputElement).value).toBe('150')
    fireEvent.change(screen.getByLabelText('Calorie (kcal) ingrediente 1'), { target: { value: '180' } })
    fireEvent.change(screen.getByLabelText('Quantità ingrediente 1 (g)'), { target: { value: '200' } })
    expect((screen.getByLabelText('Calorie (kcal) ingrediente 1') as HTMLInputElement).value).toBe('360')
    fireEvent.change(screen.getByLabelText('Percentuale mangiata'), { target: { value: '25' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registra nel diario' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Pasta al pomodoro', [expect.objectContaining({ quantity_g: 50, calories: 90, carbs_g: 15 })]))
  })

  it('blocks incomplete quantities, negative macros and invalid percentages without losing density', async () => {
    const onSave = setup()
    const save = screen.getByRole('button', { name: 'Registra nel diario' }) as HTMLButtonElement
    fireEvent.change(screen.getByLabelText('Quantità ingrediente 1 (g)'), { target: { value: '' } })
    expect(save.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Quantità ingrediente 1 (g)'), { target: { value: '100' } })
    expect((screen.getByLabelText('Calorie (kcal) ingrediente 1') as HTMLInputElement).value).toBe('150')
    fireEvent.change(screen.getByLabelText('Grassi (g) ingrediente 1'), { target: { value: '-1' } })
    expect(save.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Grassi (g) ingrediente 1'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Percentuale mangiata'), { target: { value: '101' } })
    expect(save.disabled).toBe(true)
    fireEvent.click(save)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('detaches manually added pantry ingredients and permits removing inferred components', async () => {
    const onSave = setup()
    fireEvent.click(screen.getByRole('button', { name: '+ Aggiungi ingrediente' }))
    fireEvent.click(screen.getByRole('button', { name: 'Seleziona pane' }))
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi Pasta cotta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registra nel diario' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Pasta al pomodoro', [expect.objectContaining({
      food_name: 'Pane', quantity_g: 40, pantry_item_id: null, food_key: null, dish_item_id: null,
    })]))
  })

  it('retains the review after a failed save and prevents duplicate requests while saving', async () => {
    let rejectSave: (error: Error) => void = () => {}
    const onSave = vi.fn().mockImplementationOnce(() => new Promise<void>((_, reject) => { rejectSave = reject }))
      .mockResolvedValue(undefined)
    setup({ onSave })
    const save = screen.getByRole('button', { name: 'Registra nel diario' })
    fireEvent.click(save)
    fireEvent.click(save)
    expect(onSave).toHaveBeenCalledTimes(1)
    rejectSave(new Error('offline'))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect((screen.getByLabelText('Nome del piatto') as HTMLInputElement).value).toBe('Pasta al pomodoro')
    fireEvent.click(screen.getByRole('button', { name: 'Registra nel diario' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2))
  })

  it('edits an existing diary portion without applying a second eaten percentage', async () => {
    const onSave = setup({ editing: true, initialItems: [{ ...pasta, quantity_g: 100, calories: 150, carbs_g: 30 }] })
    expect(screen.queryByLabelText('Percentuale mangiata')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Pasta al pomodoro', [expect.objectContaining({ quantity_g: 100, calories: 150, carbs_g: 30 })]))
  })
})
