export const ASSISTANT_NAME = 'Sagebite'
export const CHAT_MESSAGE_LIMIT = 1600
export const CHAT_REPLY_LIMIT = 5000
export const CHAT_CONTEXT_TURNS = 4

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export const CHAT_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'drinks'] as const
export type ChatMealType = typeof CHAT_MEAL_TYPES[number]
export const CHAT_MEAL_LABELS: Record<ChatMealType, string> = {
  breakfast: 'Colazione', lunch: 'Pranzo', dinner: 'Cena', snack: 'Spuntino', drinks: 'Bevande',
}
export const CHAT_FOOD_SOURCES = ['auto', 'basic', 'pantry', 'dish', 'prepared'] as const
export const CHAT_FOOD_UNITS = ['g', 'ml', 'portion'] as const
export type ChatFood = {
  name: string
  amount: number
  unit: typeof CHAT_FOOD_UNITS[number]
  source: typeof CHAT_FOOD_SOURCES[number]
  item_id?: string | null
}
export type ChatMealDraft = {
  date: string
  meal_type: ChatMealType
  foods: ChatFood[]
}
export type ChatMealReceipt = { entry_id: string; date: string; meal_type: ChatMealType; name: string }
export type ChatMealConfirmation = { draft: ChatMealDraft; revision: string }
export type ChatMealProposal = ChatMealConfirmation & { description: string }
export type ChatReply = { reply: string; saved?: ChatMealReceipt; proposal?: ChatMealProposal }
