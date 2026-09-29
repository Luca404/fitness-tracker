export interface GymExerciseDefinition {
  key: string
  name: string
  equipment: string
  muscle: string
  aliases?: string[]
}

export const GYM_EXERCISES: GymExerciseDefinition[] = [
  { key: 'bench-press', name: 'Panca piana', equipment: 'Bilanciere', muscle: 'Petto', aliases: ['barbell bench press', 'bench press'] },
  { key: 'incline-dumbbell-press', name: 'Panca inclinata', equipment: 'Manubri', muscle: 'Petto', aliases: ['incline dumbbell bench press', 'incline dumbbell press'] },
  { key: 'incline-barbell-press', name: 'Panca inclinata', equipment: 'Bilanciere', muscle: 'Petto', aliases: ['incline barbell bench press', 'incline barbell press'] },
  { key: 'chest-press', name: 'Chest press', equipment: 'Macchina', muscle: 'Petto' },
  { key: 'pec-deck', name: 'Pec deck', equipment: 'Macchina', muscle: 'Petto', aliases: ['butterfly'] },
  { key: 'cable-fly', name: 'Croci ai cavi', equipment: 'Cavi', muscle: 'Petto' },
  { key: 'push-up', name: 'Piegamenti', equipment: 'Corpo libero', muscle: 'Petto', aliases: ['push up'] },
  { key: 'lat-pulldown', name: 'Lat machine', equipment: 'Macchina', muscle: 'Schiena', aliases: ['lat pulldown', 'pulldown'] },
  { key: 'wide-grip-lat-pulldown', name: 'Lat machine presa larga', equipment: 'Macchina', muscle: 'Schiena', aliases: ['wide grip lat pulldown', 'wide-grip lat pulldown'] },
  { key: 'seated-row', name: 'Pulley basso', equipment: 'Cavi', muscle: 'Schiena', aliases: ['seated cable row', 'rematore seduto'] },
  { key: 'barbell-row', name: 'Rematore', equipment: 'Bilanciere', muscle: 'Schiena' },
  { key: 'dumbbell-row', name: 'Rematore', equipment: 'Manubri', muscle: 'Schiena', aliases: ['dumbbell row'] },
  { key: 'one-arm-dumbbell-row', name: 'Rematore a un braccio', equipment: 'Manubri', muscle: 'Schiena', aliases: ['one arm dumbbell row', 'single arm dumbbell row'] },
  { key: 'one-arm-cable-row', name: 'Rematore a un braccio', equipment: 'Cavi', muscle: 'Schiena', aliases: ['one arm cable row', 'single arm cable row'] },
  { key: 'pull-up', name: 'Trazioni', equipment: 'Sbarra', muscle: 'Schiena', aliases: ['pull up'] },
  { key: 'deadlift', name: 'Stacco da terra', equipment: 'Bilanciere', muscle: 'Schiena' },
  { key: 'shoulder-press', name: 'Shoulder press', equipment: 'Manubri', muscle: 'Spalle', aliases: ['dumbbell shoulder press'] },
  { key: 'machine-shoulder-press', name: 'Shoulder press', equipment: 'Macchina', muscle: 'Spalle', aliases: ['machine shoulder press'] },
  { key: 'military-press', name: 'Military press', equipment: 'Bilanciere', muscle: 'Spalle' },
  { key: 'lateral-raise', name: 'Alzate laterali', equipment: 'Manubri', muscle: 'Spalle', aliases: ['dumbbell lateral raise', 'lateral raise'] },
  { key: 'reverse-fly', name: 'Croci inverse', equipment: 'Macchina', muscle: 'Spalle' },
  { key: 'face-pull', name: 'Face pull', equipment: 'Cavi', muscle: 'Spalle' },
  { key: 'barbell-curl', name: 'Curl bicipiti', equipment: 'Bilanciere', muscle: 'Braccia' },
  { key: 'dumbbell-curl', name: 'Curl bicipiti', equipment: 'Manubri', muscle: 'Braccia', aliases: ['dumbbell curl'] },
  { key: 'hammer-curl', name: 'Curl a martello', equipment: 'Manubri', muscle: 'Braccia', aliases: ['hammer curl'] },
  { key: 'preacher-curl', name: 'Curl panca Scott', equipment: 'Macchina', muscle: 'Braccia' },
  { key: 'triceps-pushdown', name: 'Pushdown tricipiti', equipment: 'Cavi', muscle: 'Braccia', aliases: ['cable triceps pushdown', 'triceps pushdown'] },
  { key: 'overhead-triceps', name: 'French press', equipment: 'Manubri', muscle: 'Braccia', aliases: ['dumbbell triceps extension', 'triceps extension'] },
  { key: 'cable-triceps-extension', name: 'Estensioni tricipiti', equipment: 'Cavi', muscle: 'Braccia', aliases: ['cable triceps extension', 'triceps extension'] },
  { key: 'dips', name: 'Dip', equipment: 'Corpo libero', muscle: 'Braccia' },
  { key: 'squat', name: 'Squat', equipment: 'Bilanciere', muscle: 'Gambe', aliases: ['back squat', 'barbell back squat'] },
  { key: 'bulgarian-split-squat', name: 'Squat bulgaro', equipment: 'Manubri', muscle: 'Gambe', aliases: ['bulgarian split squat'] },
  { key: 'leg-press', name: 'Leg press', equipment: 'Macchina', muscle: 'Gambe' },
  { key: 'leg-extension', name: 'Leg extension', equipment: 'Macchina', muscle: 'Gambe' },
  { key: 'leg-curl', name: 'Leg curl', equipment: 'Macchina', muscle: 'Gambe' },
  { key: 'lying-leg-curl', name: 'Leg curl da sdraiato', equipment: 'Macchina', muscle: 'Gambe', aliases: ['lying leg curl'] },
  { key: 'dumbbell-lunge', name: 'Affondi', equipment: 'Manubri', muscle: 'Gambe', aliases: ['dumbbell lunges', 'dumbbell lunge'] },
  { key: 'romanian-deadlift', name: 'Stacco rumeno', equipment: 'Bilanciere', muscle: 'Gambe', aliases: ['romanian deadlift', 'rdl'] },
  { key: 'hip-thrust', name: 'Hip thrust', equipment: 'Bilanciere', muscle: 'Glutei' },
  { key: 'calf-raise', name: 'Calf raise', equipment: 'Macchina', muscle: 'Polpacci' },
  { key: 'abductor', name: 'Abductor', equipment: 'Macchina', muscle: 'Glutei' },
  { key: 'adductor', name: 'Adductor', equipment: 'Macchina', muscle: 'Gambe' },
  { key: 'cable-crunch', name: 'Crunch ai cavi', equipment: 'Cavi', muscle: 'Addome' },
  { key: 'ab-crunch', name: 'Crunch', equipment: 'Macchina', muscle: 'Addome' },
  { key: 'hanging-knee-raise', name: 'Sollevamento ginocchia alla sbarra', equipment: 'Sbarra', muscle: 'Addome', aliases: ['hanging knee raise'] },
  { key: 'reverse-crunch', name: 'Crunch inverso', equipment: 'Corpo libero', muscle: 'Addome', aliases: ['reverse crunch'] },
]

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
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
