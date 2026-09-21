type ConfirmationClaims = {
  version: 1
  user_id: string
  barcode: string
  expires_at: number
}

function signingSecret(): string {
  const direct = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    || Deno.env.get('SUPABASE_SECRET_KEY')
  if (direct) return direct

  const encodedKeys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (encodedKeys) {
    try {
      const keys = JSON.parse(encodedKeys) as Record<string, unknown>
      const preferred = keys.default
      if (typeof preferred === 'string' && preferred) return preferred
      const fallback = Object.values(keys).find(
        (value): value is string => typeof value === 'string' && value.length > 0,
      )
      if (fallback) return fallback
    } catch {
      // Fall through to the explicit configuration error below.
    }
  }
  throw new Error('Confirmation signing secret is not configured')
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function createConfirmationToken(userId: string, barcode: string): Promise<string> {
  const claims: ConfirmationClaims = {
    version: 1,
    user_id: userId,
    barcode,
    expires_at: Date.now() + 2 * 60 * 60 * 1000,
  }
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims)))
  const signature = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(),
    new TextEncoder().encode(payload),
  )
  return `${payload}.${base64UrlEncode(new Uint8Array(signature))}`
}

export async function verifyConfirmationToken(
  token: string,
  userId: string,
  barcode: string,
): Promise<boolean> {
  const [payload, signature, extra] = token.split('.')
  if (!payload || !signature || extra) return false
  try {
    const validSignature = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(),
      base64UrlDecode(signature),
      new TextEncoder().encode(payload),
    )
    if (!validSignature) return false
    const claims = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as Partial<ConfirmationClaims>
    return claims.version === 1
      && claims.user_id === userId
      && claims.barcode === barcode
      && typeof claims.expires_at === 'number'
      && claims.expires_at > Date.now()
  } catch {
    return false
  }
}
