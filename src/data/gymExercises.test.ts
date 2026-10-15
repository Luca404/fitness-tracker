import { describe, expect, it } from 'vitest'
import { searchGymExercises } from './gymExercises'

describe('gym exercise search', () => {
  it('searches personal exercises by name/equipment and avoids duplicate catalog entries', () => {
    const custom = { key: 'custom:1', name: 'Croci su panca', equipment: 'Manubri', muscle: 'Personalizzato', custom: true }
    const duplicate = { ...custom, key: 'custom:2', name: 'croci su PANCA' }
    const standard = { ...custom, key: 'custom:3', name: 'Panca piana', equipment: 'Bilanciere' }
    expect(searchGymExercises('croci manubri', [custom, duplicate, standard])).toEqual([custom])
    expect(searchGymExercises('panca piana', [standard])).toHaveLength(1)
  })

  it('finds exercises by equipment and name, ignoring accents', () => {
    expect(searchGymExercises('manubri rematore').map(exercise => exercise.key)).toContain('dumbbell-row')
    expect(searchGymExercises('panca scott').map(exercise => exercise.key)).toContain('preacher-curl')
  })

  it.each([
    ['Barbell Bench Press', 'bench-press'],
    ['Wide-Grip Lat Pulldown', 'wide-grip-lat-pulldown'],
    ['Incline Dumbbell Bench Press', 'incline-dumbbell-press'],
    ['Seated Cable Row', 'seated-row'],
    ['Dumbbell Lateral Raise', 'lateral-raise'],
    ['Dumbbell Curl', 'dumbbell-curl'],
    ['Cable Triceps Pushdown', 'triceps-pushdown'],
    ['Back Squat', 'squat'],
    ['Romanian Deadlift', 'romanian-deadlift'],
    ['Bulgarian Split Squat', 'bulgarian-split-squat'],
    ['Leg Extension', 'leg-extension'],
    ['Lying Leg Curl', 'lying-leg-curl'],
    ['Hanging Knee Raise', 'hanging-knee-raise'],
    ['Reverse Crunch', 'reverse-crunch'],
    ['Incline Barbell Bench Press', 'incline-barbell-press'],
    ['Lat Machine', 'lat-pulldown'],
    ['Shoulder Press', 'shoulder-press'],
    ['One-Arm Dumbbell Row', 'one-arm-dumbbell-row'],
    ['One-Arm Cable Row', 'one-arm-cable-row'],
    ['Hammer Curl', 'hammer-curl'],
    ['Triceps Extension', 'cable-triceps-extension'],
    ['Dumbbell Lunges', 'dumbbell-lunge'],
  ])('finds %s', (query, key) => {
    expect(searchGymExercises(query).map(exercise => exercise.key)).toContain(key)
  })
})
