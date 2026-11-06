import { describe, expect, it } from 'vitest'
import { GYM_EXERCISES, GYM_MUSCLE_GROUPS, resolveGymExercise, searchGymExercises } from './gymExercises'

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

  it('assigns every catalog exercise to a supported muscle group, including arms and lower body', () => {
    expect(GYM_EXERCISES.every(exercise => GYM_MUSCLE_GROUPS.some(group => group === exercise.muscle))).toBe(true)
    for (const [key, muscle] of [['dumbbell-curl', 'Bicipiti'], ['dips', 'Tricipiti'],
      ['hip-thrust', 'Gambe'], ['calf-raise', 'Gambe'], ['cable-crunch', 'Addome']]) {
      const exercise = GYM_EXERCISES.find(item => item.key === key)!
      expect(resolveGymExercise(exercise).muscle).toBe(muscle)
    }
  })

  it.each([
    ['Croci su panca', 'Petto'], ['Curl femorali', 'Gambe'], ['Leg raise', 'Addome'],
    ['Face pull alla corda', 'Spalle'], ['Rematore al macchinario', 'Schiena'],
    ['Estensioni tricipiti sopra la testa', 'Tricipiti'], ['Curl concentrato', 'Bicipiti'],
    ['Movimento personale A', 'Altro'],
  ])('classifies personal exercise %s conservatively as %s', (name, muscle) => {
    expect(resolveGymExercise({ name, equipment: 'Personalizzato' }).muscle).toBe(muscle)
  })

  it('deduplicates known personal aliases and redundant bodyweight suffixes without merging different equipment', () => {
    const custom = [
      { key: 'custom:1', name: 'Panca piana con bilancieri', equipment: 'Bilancieri', muscle: 'Petto' },
      { key: 'custom:2', name: 'Piegamenti (corpo libero)', equipment: 'Corpo libero', muscle: 'Petto' },
      { key: 'custom:3', name: 'Panca piana', equipment: 'Cavi', muscle: 'Petto' },
    ]
    const catalog = searchGymExercises('', custom)
    expect(catalog.some(exercise => exercise.key === 'custom:1' || exercise.key === 'custom:2')).toBe(false)
    expect(catalog.some(exercise => exercise.key === 'custom:3')).toBe(true)
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
