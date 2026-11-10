export type DecimalSeparator = '.' | ','
export const DECIMAL_SEPARATOR_KEY = 'fittrackr.decimal-separator.v1'

const listeners = new Set<() => void>()
let fallback: DecimalSeparator = '.'
let unsaved: DecimalSeparator | null = null

export function getDecimalSeparator(): DecimalSeparator {
  if (unsaved !== null) return unsaved
  try { return localStorage.getItem(DECIMAL_SEPARATOR_KEY) === ',' ? ',' : '.' }
  catch { return fallback }
}

function notify() { listeners.forEach(listener => listener()) }
function onStorage(event: StorageEvent) {
  if (event.key === DECIMAL_SEPARATOR_KEY || event.key === null) { unsaved = null; notify() }
}

export function subscribeNumberPreferences(listener: () => void) {
  if (listeners.size === 0) window.addEventListener('storage', onStorage)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.removeEventListener('storage', onStorage)
  }
}

export function setDecimalSeparator(separator: DecimalSeparator) {
  fallback = separator
  try { localStorage.setItem(DECIMAL_SEPARATOR_KEY, separator); unsaved = null }
  catch { unsaved = separator }
  notify()
}
