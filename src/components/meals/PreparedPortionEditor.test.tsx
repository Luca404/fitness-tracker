import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { MealEntry } from '../../types'
import PreparedPortionEditor from './PreparedPortionEditor'

afterEach(cleanup)

const entry: MealEntry = {
  id: 'entry', meal_id: 'lunch', name: 'Riso', created_at: '', prepared_batch_id: 'batch', cooked_portion_g: 200,
  items: [{ id: 'item', entry_id: 'entry', meal_id: 'lunch', food_name: 'Riso', quantity_g: 100,
    unit: 'g', calories: 400, protein_g: 20, carbs_g: 60, fat_g: 10, category: 'grain',
    source: 'manual', food_key: null, off_food_id: null, created_at: '' }],
}

it('previews nutrition and remaining grams, blocks invalid portions and cancels without saving', () => {
  const onSave = vi.fn()
  const onCancel = vi.fn()
  function Harness() {
    const [grams, setGrams] = useState(200)
    return <PreparedPortionEditor entry={entry} amounts={{ total_cooked_g: 600, remaining_g: 200 }}
      grams={grams} onChange={setGrams} onSave={onSave} onCancel={onCancel} saving={false} />
  }
  render(<Harness />)
  const preview = within(screen.getByRole('region', { name: 'Anteprima porzione' }))
  expect(preview.getByText('400 kcal')).toBeTruthy()
  const input = screen.getByRole('spinbutton', { name: 'Grammi mangiati' })
  fireEvent.change(input, { target: { value: '100,25' } })
  expect(preview.getByText('200.5 kcal')).toBeTruthy()
  expect(preview.getByText('100.25 g')).toBeTruthy()
  expect(preview.getByText('299.75 g')).toBeTruthy()
  expect(preview.getByText('10 g')).toBeTruthy()
  fireEvent.change(input, { target: { value: '401' } })
  expect((screen.getByRole('button', { name: 'Salva porzione' }) as HTMLButtonElement).disabled).toBe(true)
  expect(preview.getByText('— kcal')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Annulla' }))
  expect(onCancel).toHaveBeenCalledTimes(1)
  expect(onSave).not.toHaveBeenCalled()
  expect(entry.cooked_portion_g).toBe(200)
  expect(entry.items[0].calories).toBe(400)
})
