import { CHAT_FOOD_SOURCES, CHAT_FOOD_UNITS, CHAT_MEAL_TYPES } from '../_shared/fitnessChat.ts'
import type { UserGoals, UserHealthProfile, WeightLog } from '../../../src/types/index.ts'
import { DiaryInputError, findFoods, rangeLength } from './diary.ts'
import type { diaryApi } from './diary.ts'

type DiaryApi = ReturnType<typeof diaryApi>

function schema(properties: Record<string, unknown>) {
  return { type: 'object', additionalProperties: false, properties, required: Object.keys(properties) }
}

function tool(name: string, description: string, properties: Record<string, unknown>) {
  return { type: 'function', name, description, strict: true, parameters: schema(properties) }
}

const date = { type: 'string', description: 'Data inclusiva nel formato YYYY-MM-DD.' }
const range = { from: date, to: date }

export const tools = [
  tool('read_profile_context', 'Legge l’obiettivo del profilo e i target giornalieri correnti di calorie e proteine. Usalo per dare un consiglio personalizzato o valutare i progressi. Per l’andamento nel tempo usa anche lo storico del peso.', {
    include_latest_weight: { type: 'boolean', description: 'Vero solo se la domanda riguarda il peso o i progressi e serve l’ultima pesata con la sua data.' },
  }),
  tool('read_food_diary', 'Legge calorie, macro, obiettivi correnti, giornate registrate e facoltativamente i nomi dei pasti dell’utente. Per lo storico usa al massimo 90 giorni; dettagli per al massimo 7 giorni.', {
    ...range, include_details: { type: 'boolean', description: 'Vero se l’utente chiede quali piatti ha registrato o una spiegazione basata sui pasti.' },
  }),
  tool('read_fitness_history', 'Legge le misurazioni del peso oppure attività e sedute completate dell’utente negli ultimi 90 giorni richiesti.', {
    ...range, data: { type: 'string', enum: ['weight', 'activities'] },
  }),
  tool('find_diary_food', 'Cerca per nome negli alimenti base, nella dispensa, nelle ricette salvate e nei piatti pronti dell’utente. Usalo per trovare opzioni o risolvere un nome non riconosciuto.', {
    name: { type: 'string' },
  }),
  tool('prepare_meal', 'Prepara la registrazione di qualcosa che l’utente dice di aver già mangiato o bevuto e vuole registrare. Usalo quando data, pasto, alimento e quantità sono sufficienti. Il backend decide se salvare o chiedere conferma.', {
    date, meal_type: { type: 'string', enum: CHAT_MEAL_TYPES },
    foods: { type: 'array', items: schema({
      name: { type: 'string', description: 'Nome indicato dall’utente, mantenendo le parole sul peso a crudo o cotto. Usa il nome scelto dall’utente per una voce ambigua.' },
      amount: { type: 'number', description: 'Quantità dichiarata, convertendo kg in g e litri in ml.' },
      unit: { type: 'string', enum: CHAT_FOOD_UNITS, description: 'portion è la porzione di una ricetta salvata, non una stima.' },
      source: { type: 'string', enum: CHAT_FOOD_SOURCES, description: 'Usa auto salvo indicazione esplicita di alimento base, dispensa, ricetta o preparazione pronta.' },
      item_id: { type: ['string', 'null'], description: 'ID restituito da find_diary_food per la voce personale scelta dall’utente. Usa null in tutti gli altri casi.' },
    }) },
  }),
]

function checkRange(args: Record<string, unknown>, today: string, max: number) {
  const days = rangeLength(args.from, args.to)
  if (!Number.isInteger(days) || days < 1 || days > max || String(args.to) > today) {
    throw new DiaryInputError(`Indica un intervallo di date valido fino a oggi, di massimo ${max} giorni.`)
  }
  return { from: String(args.from), to: String(args.to) }
}

async function readProfileContext(db: DiaryApi, today: string, includeLatestWeight: boolean) {
  const [[profile], [goals], [weight]] = await Promise.all([
    db.rows<Pick<UserHealthProfile, 'objective'>>('user_health_profiles', { select: 'objective', limit: '1' }),
    db.rows<Pick<UserGoals, 'calorie_target' | 'protein_g'>>('user_goals', { select: 'calorie_target,protein_g', limit: '1' }),
    includeLatestWeight ? db.rows<Pick<WeightLog, 'date' | 'weight_kg'>>('weight_logs', {
      select: 'date,weight_kg', date: `lte.${today}`, order: 'date.desc', limit: '1',
    }) : [],
  ])
  return {
    objective: profile?.objective ?? null,
    daily_targets: goals ? { calories: goals.calorie_target, protein_g: goals.protein_g } : null,
    ...(includeLatestWeight ? { latest_weight: weight ? { date: weight.date, weight_kg: weight.weight_kg } : null } : {}),
  }
}

export async function readTool(db: DiaryApi, name: string, args: Record<string, unknown>, today: string): Promise<unknown> {
  if (name === 'read_profile_context') {
    if (typeof args.include_latest_weight !== 'boolean') throw new DiaryInputError('Specifica se serve anche l’ultima pesata.')
    return readProfileContext(db, today, args.include_latest_weight)
  }
  if (name === 'find_diary_food') {
    if (typeof args.name !== 'string') throw new DiaryInputError('Indica il nome da cercare.')
    return findFoods(db, args.name)
  }
  if (name === 'read_food_diary') {
    if (typeof args.include_details !== 'boolean') throw new DiaryInputError('Specifica se servono i dettagli dei pasti.')
    const { from, to } = checkRange(args, today, args.include_details ? 7 : 90)
    return db.rpc('get_fitness_chat_diary', { p_from: from, p_to: to, p_detail: args.include_details })
  }
  if (name !== 'read_fitness_history') throw new DiaryInputError('Strumento non disponibile.')
  const { from, to } = checkRange(args, today, 90)
  const query = { and: `(date.gte.${from},date.lte.${to})`, order: 'date.desc' }
  if (args.data === 'weight') {
    return { from, to, measurements: await db.rows('weight_logs', { ...query, select: 'date,weight_kg', limit: '90' }) }
  }
  if (args.data !== 'activities') throw new DiaryInputError('Scegli tra misurazioni del peso e attività.')
  const [activities, sessions] = await Promise.all([
    db.rows('workouts', { ...query, select: 'date,activity,duration_min,distance_km,calories_burned', limit: '121' }),
    db.rows('gym_sessions', { ...query, completed_at: 'not.is.null', select: 'date,plan_name', limit: '121' }),
  ])
  return { from, to, activities: activities.slice(0, 120), gym_sessions: sessions.slice(0, 120), truncated: activities.length > 120 || sessions.length > 120 }
}
