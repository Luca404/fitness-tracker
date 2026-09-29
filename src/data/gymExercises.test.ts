import { describe, expect, it } from 'vitest'
import { searchGymExercises } from './gymExercises'

describe('gym exercise search', () => {
  it('finds exercises by equipment and name, ignoring accents', () => {
    expect(searchGymExercises('manubri rematore').map(exercise => exercise.key)).toContain('dumbbell-row')
    expect(searchGymExercises('panca scott').map(exercise => exercise.key)).toContain('preacher-curl')
  })
})
