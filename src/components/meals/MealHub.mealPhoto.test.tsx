import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { DishItemDraft } from '../../types'
import type { MealHubMode } from './MealHub'

const mocks = vi.hoisted(() => ({
  getDishes: vi.fn().mockResolvedValue([]), createPreparedBatch: vi.fn(),
  createDish: vi.fn(), showToast: vi.fn(), analyzeMealPhoto: vi.fn(),
}))
vi.mock('../../services/api', () => mocks)
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))
vi.mock('../../contexts/DataContext', () => ({ useData: () => ({ showToast: mocks.showToast, setDishIcon: vi.fn() }) }))
vi.mock('./PreparedDishesPanel', () => ({ default: () => null }))
vi.mock('../../services/mealPhoto', async importOriginal => ({
  ...await importOriginal<typeof import('../../services/mealPhoto')>(), analyzeMealPhoto: mocks.analyzeMealPhoto,
}))
import MealHub from './MealHub'

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn().mockReturnValue('blob:meal-photo')
  URL.revokeObjectURL = vi.fn()
  mocks.analyzeMealPhoto.mockResolvedValue({
    name: 'Risotto ai funghi', confidence: 'medium', warnings: ['Burro ipotizzato.'],
    items: [
      { food_name: 'Riso cotto', quantity_g: 200, category: 'grain', calories: 260, protein_g: 5, carbs_g: 56, fat_g: 1, assumed: false, note: null },
      { food_name: 'Burro', quantity_g: 10, category: 'fat', calories: 75, protein_g: 0, carbs_g: 0, fat_g: 8, assumed: true, note: 'Ricetta del risotto.' },
    ],
  })
})
afterEach(cleanup)

function TestHub({ onAddEntry }: { onAddEntry: (name: string, items: DishItemDraft[]) => Promise<void> }) {
  const [mode, setMode] = useState<MealHubMode>('list')
  return <MealHub mode={mode} setMode={setMode} mealType="dinner" date="2026-10-08" onAddEntry={onAddEntry} />
}

describe('occasional meal photo flow', () => {
  it('reviews a photo and logs the eaten share without creating a recipe or preparation', async () => {
    const onAddEntry = vi.fn().mockResolvedValue(undefined)
    render(<TestHub onAddEntry={onAddEntry} />)
    fireEvent.click(screen.getByRole('button', { name: /Occasionale/ }))
    fireEvent.click(screen.getByRole('button', { name: /Da foto/ }))
    const file = new File(['photo'], 'risotto.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText('Scegli foto del piatto'), { target: { files: [file] } })
    fireEvent.change(screen.getByLabelText('Descrizione del piatto (facoltativa)'), { target: { value: 'Risotto ai funghi dal menù' } })
    fireEvent.click(screen.getByRole('button', { name: 'Analizza piatto' }))
    expect(await screen.findByText('📸 Stimato da foto')).toBeTruthy()
    expect(mocks.analyzeMealPhoto).toHaveBeenCalledWith(file, 'Risotto ai funghi dal menù')
    expect(onAddEntry).not.toHaveBeenCalled()
    expect(document.querySelector('details')?.open).toBe(false)
    expect(screen.getByText('· Ipotizzato')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Metà' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registra nel diario' }))
    await waitFor(() => expect(onAddEntry).toHaveBeenCalledWith('Risotto ai funghi', [
      expect.objectContaining({ food_name: 'Riso cotto', quantity_g: 100, calories: 130, pantry_item_id: null, source: 'ai_meal_photo' }),
      expect.objectContaining({ food_name: 'Burro', quantity_g: 5, calories: 37.5, fat_g: 4 }),
    ]))
    expect(mocks.createPreparedBatch).not.toHaveBeenCalled()
    expect(mocks.createDish).not.toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: /Occasionale/ })).toBeTruthy()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:meal-photo')
  })

  it('keeps the photo and description for a retry after an analysis error', async () => {
    mocks.analyzeMealPhoto.mockRejectedValueOnce(new Error('Foto non leggibile'))
    render(<TestHub onAddEntry={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Occasionale/ }))
    fireEvent.click(screen.getByRole('button', { name: /Da foto/ }))
    fireEvent.change(screen.getByLabelText('Scatta foto del piatto'), { target: { files: [new File(['photo'], 'meal.jpg', { type: 'image/jpeg' })] } })
    fireEvent.click(screen.getByRole('button', { name: 'Analizza piatto' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByAltText('Anteprima del piatto')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Analizza piatto' }))
    expect(await screen.findByText('📸 Stimato da foto')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Torna alla foto/ }))
    expect(screen.getByAltText('Anteprima del piatto')).toBeTruthy()
  })
})
