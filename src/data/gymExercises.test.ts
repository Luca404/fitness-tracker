import { describe, expect, it } from 'vitest'
import { searchGymExercises } from './gymExercises'

describe('gym exercise search', () => {
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
