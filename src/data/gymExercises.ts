export interface GymExerciseDefinition {
  key: string
  name: string
  equipment: string
  muscle: string
  aliases?: string[]
  custom?: boolean
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
  { key: 'barbell-curl', name: 'Curl bicipiti', equipment: 'Bilanciere', muscle: 'Bicipiti' },
  { key: 'dumbbell-curl', name: 'Curl bicipiti', equipment: 'Manubri', muscle: 'Bicipiti', aliases: ['dumbbell curl'] },
  { key: 'hammer-curl', name: 'Curl a martello', equipment: 'Manubri', muscle: 'Bicipiti', aliases: ['hammer curl'] },
  { key: 'preacher-curl', name: 'Curl panca Scott', equipment: 'Macchina', muscle: 'Bicipiti' },
  { key: 'triceps-pushdown', name: 'Pushdown tricipiti', equipment: 'Cavi', muscle: 'Tricipiti', aliases: ['cable triceps pushdown', 'triceps pushdown'] },
  { key: 'overhead-triceps', name: 'French press', equipment: 'Manubri', muscle: 'Tricipiti', aliases: ['dumbbell triceps extension', 'triceps extension'] },
  { key: 'cable-triceps-extension', name: 'Estensioni tricipiti', equipment: 'Cavi', muscle: 'Tricipiti', aliases: ['cable triceps extension', 'triceps extension'] },
  { key: 'dips', name: 'Dip', equipment: 'Corpo libero', muscle: 'Tricipiti' },
  { key: 'squat', name: 'Squat', equipment: 'Bilanciere', muscle: 'Gambe', aliases: ['back squat', 'barbell back squat'] },
  { key: 'bulgarian-split-squat', name: 'Squat bulgaro', equipment: 'Manubri', muscle: 'Gambe', aliases: ['bulgarian split squat'] },
  { key: 'leg-press', name: 'Leg press', equipment: 'Macchina', muscle: 'Gambe' },
  { key: 'leg-extension', name: 'Leg extension', equipment: 'Macchina', muscle: 'Gambe' },
  { key: 'leg-curl', name: 'Leg curl', equipment: 'Macchina', muscle: 'Gambe' },
  { key: 'lying-leg-curl', name: 'Leg curl da sdraiato', equipment: 'Macchina', muscle: 'Gambe', aliases: ['lying leg curl'] },
  { key: 'dumbbell-lunge', name: 'Affondi', equipment: 'Manubri', muscle: 'Gambe', aliases: ['dumbbell lunges', 'dumbbell lunge'] },
  { key: 'romanian-deadlift', name: 'Stacco rumeno', equipment: 'Bilanciere', muscle: 'Gambe', aliases: ['romanian deadlift', 'rdl'] },
  { key: 'hip-thrust', name: 'Hip thrust', equipment: 'Bilanciere', muscle: 'Gambe' },
  { key: 'calf-raise', name: 'Calf raise', equipment: 'Macchina', muscle: 'Gambe' },
  { key: 'abductor', name: 'Abductor', equipment: 'Macchina', muscle: 'Gambe' },
  { key: 'adductor', name: 'Adductor', equipment: 'Macchina', muscle: 'Gambe' },
  { key: 'cable-crunch', name: 'Crunch ai cavi', equipment: 'Cavi', muscle: 'Addome' },
  { key: 'ab-crunch', name: 'Crunch', equipment: 'Macchina', muscle: 'Addome' },
  { key: 'hanging-knee-raise', name: 'Sollevamento ginocchia alla sbarra', equipment: 'Sbarra', muscle: 'Addome', aliases: ['hanging knee raise'] },
  { key: 'reverse-crunch', name: 'Crunch inverso', equipment: 'Corpo libero', muscle: 'Addome', aliases: ['reverse crunch'] },
]

export const GYM_MUSCLE_GROUPS = ['Petto', 'Bicipiti', 'Schiena', 'Tricipiti', 'Spalle', 'Gambe', 'Addome'] as const
export type GymMuscleGroup = typeof GYM_MUSCLE_GROUPS[number] | 'Altro'

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

const EQUIPMENT_NAMES: Record<string, string> = {
  bilanciere: 'Bilanciere', bilancieri: 'Bilanciere', barbell: 'Bilanciere',
  manubrio: 'Manubri', manubri: 'Manubri', dumbbell: 'Manubri', dumbbells: 'Manubri',
  cavo: 'Cavi', cavi: 'Cavi', cable: 'Cavi', cables: 'Cavi',
  macchina: 'Macchina', machine: 'Macchina',
  'corpo libero': 'Corpo libero', bodyweight: 'Corpo libero', sbarra: 'Sbarra',
}

function cleanName(value: string): string {
  return value.trim().replace(/\s*\(?\s*(?:a\s+)?(?:corpo libero|bodyweight)\s*\)?\s*$/i, '').trim() || value.trim()
}

function nameIdentity(name: string, equipment: string): string {
  const normalized = normalize(cleanName(name))
  // Equipment is already part of the identity; redundant suffixes add no variant.
  const suffixes = Object.keys(EQUIPMENT_NAMES).filter(key => EQUIPMENT_NAMES[key] === equipment)
  for (const suffix of suffixes) {
    if (normalized.endsWith(` ${suffix}`)) {
      return normalized.slice(0, -suffix.length).trim().replace(/\s+(con|al|ai|alla|alle)$/, '')
    }
  }
  return normalized
}

const MUSCLE_PATTERNS: [GymMuscleGroup, RegExp][] = [
  ['Addome', /\b(crunch|addominali|addome|plank|knee raise|leg raise|ab wheel|sit up)\b/],
  ['Gambe', /\b(squat|leg|affondi?|lunge|stacco rumeno|romanian|rdl|hip thrust|calf|polpacci|glutei|femorali|abductor|adductor|goblet)\b/],
  ['Tricipiti', /\b(tricipiti|triceps|pushdown|push down|french press|dip|dips)\b/],
  ['Bicipiti', /\b(bicipiti|biceps|curl|scott)\b/],
  ['Spalle', /\b(spalle|shoulder|military|alzate|lateral raise|croci inverse|reverse fly|face pull|arnold press)\b/],
  ['Schiena', /\b(schiena|dorsali|lat|pulley|rematore|row|trazioni|pull up|chin up|stacco|deadlift|pulldown|pull down)\b/],
  ['Petto', /\b(petto|panca|bench press|chest|pec deck|croci|fly|piegamenti|push up)\b/],
]

type ExerciseIdentityInput = { key?: string | null; name: string; equipment: string }

/** Resolve only matching movements/equipment; never rewrite saved plans or sets. */
export function resolveGymExercise(exercise: ExerciseIdentityInput): {
  key: string; name: string; equipment: string; muscle: GymMuscleGroup
} {
  const equipment = EQUIPMENT_NAMES[normalize(exercise.equipment)] ?? exercise.equipment.trim()
  const name = nameIdentity(exercise.name, equipment)
  const sameEquipment = (definition: GymExerciseDefinition) => definition.equipment === equipment
  const definition = GYM_EXERCISES.find(item => item.key === exercise.key && sameEquipment(item))
    ?? GYM_EXERCISES.find(item => sameEquipment(item)
      && [item.name, ...(item.aliases ?? [])].some(alias => nameIdentity(alias, equipment) === name))
  return {
    key: definition?.key ?? `name:${name}`,
    name: definition?.name ?? cleanName(exercise.name),
    equipment,
    muscle: definition ? definition.muscle as GymMuscleGroup
      : MUSCLE_PATTERNS.find(([, pattern]) => pattern.test(name))?.[0] ?? 'Altro',
  }
}

export function searchGymExercises(query: string, customExercises: GymExerciseDefinition[] = []): GymExerciseDefinition[] {
  const identityOf = (exercise: GymExerciseDefinition) => {
    const resolved = resolveGymExercise(exercise)
    return `${resolved.key}:${normalize(resolved.equipment)}`
  }
  const seen = new Set(GYM_EXERCISES.map(identityOf))
  const personal = customExercises.filter(exercise => {
    const identity = identityOf(exercise)
    if (seen.has(identity)) return false
    seen.add(identity)
    return true
  })
  const catalog = [...personal, ...GYM_EXERCISES]
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return catalog
  return catalog.filter(exercise => {
    const searchable = normalize([
      exercise.name, exercise.equipment, exercise.muscle, ...(exercise.aliases ?? []),
    ].join(' '))
    return terms.every(term => searchable.includes(term))
  })
}
