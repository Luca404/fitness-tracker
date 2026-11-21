export const ASSISTANT_NAME = 'Sagebite'
export const CHAT_MESSAGE_LIMIT = 1600
export const CHAT_REPLY_LIMIT = 5000
export const CHAT_CONTEXT_TURNS = 4

export type ChatMessage = { role: 'user' | 'assistant'; content: string }
