import { createClient } from '@supabase/supabase-js'
import { readAuthCallback } from '../utils/auth'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')
}

// Capture callback state before the SDK consumes the URL fragment.
export const initialAuthCallback = readAuthCallback(new URL(window.location.href))
export const supabase = createClient(url, key)

export async function isGoogleAuthEnabled(signal: AbortSignal): Promise<boolean> {
  const response = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: key },
    signal,
    cache: 'no-store',
  })
  if (!response.ok) return false
  const settings = await response.json()
  return settings.external?.google === true
}
