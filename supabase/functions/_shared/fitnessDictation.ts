export const DICTATION_MAX_BYTES = 2 * 1024 * 1024
export const DICTATION_MAX_SECONDS = 30

export const DICTATION_FORMATS = {
  'audio/webm': 'webm',
  'audio/mp4': 'mp4',
  'audio/ogg': 'ogg',
} as const

export function dictationExtension(mimeType: string) {
  const format = mimeType.split(';', 1)[0].trim().toLowerCase()
  if (!Object.hasOwn(DICTATION_FORMATS, format)) return null
  return DICTATION_FORMATS[format as keyof typeof DICTATION_FORMATS]
}
