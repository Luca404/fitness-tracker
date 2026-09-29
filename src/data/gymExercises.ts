export interface GymExerciseDefinition {
  key: string
  name: string
  equipment: string
  muscle: string
  aliases?: string[]
}

export const GYM_EXERCISES: GymExerciseDefinition[] = [
  { key: 'bench-press', name: 'Panca piana', equipment: 'Bilanciere', muscle: 'Petto', aliases: ['bench press'] },
  { key: 'incline-dumbbell-press', name: 'Panca inclinata', equipment: 'Manubri', muscle: 'Petto' },
  { key: 'chest-press', name: 'Chest press', equipment: 'Macchina', muscle: 'Petto' },
  { key: 'pec-deck', name: 'Pec deck', equipment: 'Macchina', muscle: 'Petto', aliases: ['butterfly'] },
  { key: 'cable-fly', name: 'Croci ai cavi', equipment: 'Cavi', muscle: 'Petto' },
  { key: 'push-up', name: 'Piegamenti', equipment: 'Corpo libero', muscle: 'Petto', aliases: ['push up'] },
  { key: 'lat-pulldown', name: 'Lat machine', equipment: 'Macchina', muscle: 'Schiena', aliases: ['pulldown'] },
  { key: 'seated-row', name: 'Pulley basso', equipment: 'Cavi', muscle: 'Schiena', aliases: ['rematore seduto'] },
  { key: 'barbell-row', name: 'Rematore', equipment: 'Bilanciere', muscle: 'Schiena' },
  { key: 'dumbbell-row', name: 'Rematore', equipment: 'Manubri', muscle: 'Schiena' },
  { key: 'pull-up', name: 'Trazioni', equipment: 'Sbarra', muscle: 'Schiena', aliases: ['pull up'] },
  { key: 'deadlift', name: 'Stacco da terra', equipment: 'Bilanciere', muscle: 'Schiena' },
  { key: 'shoulder-press', name: 'Shoulder press', equipment: 'Manubri', muscle: 'Spalle' },
  { key: 'military-press', name: 'Military press', equipment: 'Bilanciere', muscle: 'Spalle' },
  { key: 'lateral-raise', name: 'Alzate laterali', equipment: 'Manubri', muscle: 'Spalle' },
  { key: 'reverse-fly', name: 'Croci inverse', equipment: 'Macchina', muscle: 'Spalle' },
  { key: 'face-pull', name: 'Face pull', equipment: 'Cavi', muscle: 'Spalle' },
  { key: 'barbell-curl', name: 'Curl bicipiti', equipment: 'Bilanciere', muscle: 'Braccia' },
  { key: 'dumbbell-curl', name: 'Curl bicipiti', equipment: 'Manubri', muscle: 'Braccia' },
  { key: 'hammer-curl', name: 'Curl a martello', equipment: 'Manubri', muscle: 'Braccia' },
  { key: 'preacher-curl', name: 'Curl panca Scott', equipment: 'Macchina', muscle: 'Braccia' },
  { key: 'triceps-pushdown', name: 'Pushdown tricipiti', equipment: 'Cavi', muscle: 'Braccia' },
  { key: 'overhead-triceps', name: 'French press', equipment: 'Manubri', muscle: 'Braccia' },
  { key: 'dips', name: 'Dip', equipment: 'Corpo libero', muscle: 'Braccia' },
  { key: 'squat', name: 'Squat', equipment: 'Bilanciere', muscle: 'Gambe' },
  { key: 'leg-press', name: 'Leg press', equipment: 'Macchina', muscle: 'Gambe' },
  { key: 'leg-extension', name: 'Leg extension', equipment: 'Macchina', muscle: 'Gambe' },
  { key: 'leg-curl', name: 'Leg curl', equipment: 'Macchina', muscle: 'Gambe' },
  { key: 'dumbbell-lunge', name: 'Affondi', equipment: 'Manubri', muscle: 'Gambe' },
  { key: 'romanian-deadlift', name: 'Stacco rumeno', equipment: 'Bilanciere', muscle: 'Gambe' },
  { key: 'hip-thrust', name: 'Hip thrust', equipment: 'Bilanciere', muscle: 'Glutei' },
  { key: 'calf-raise', name: 'Calf raise', equipment: 'Macchina', muscle: 'Polpacci' },
  { key: 'abductor', name: 'Abductor', equipment: 'Macchina', muscle: 'Glutei' },
  { key: 'adductor', name: 'Adductor', equipment: 'Macchina', muscle: 'Gambe' },
  { key: 'cable-crunch', name: 'Crunch ai cavi', equipment: 'Cavi', muscle: 'Addome' },
  { key: 'ab-crunch', name: 'Crunch', equipment: 'Macchina', muscle: 'Addome' },
]

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export function searchGymExercises(query: string): GymExerciseDefinition[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return GYM_EXERCISES
  return GYM_EXERCISES.filter(exercise => {
    const searchable = normalize([
      exercise.name, exercise.equipment, exercise.muscle, ...(exercise.aliases ?? []),
    ].join(' '))
    return terms.every(term => searchable.includes(term))
  })
}
