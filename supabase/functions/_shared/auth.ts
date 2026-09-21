export type AuthenticatedUser = { id: string }

export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const authorization = request.headers.get('Authorization')
  const apiKey = request.headers.get('apikey')
  if (!supabaseUrl || !authorization || !apiKey) return null

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authorization, apikey: apiKey },
    })
    if (!response.ok) return null
    const user = await response.json() as Record<string, unknown>
    return typeof user.id === 'string' && user.id ? { id: user.id } : null
  } catch (error) {
    console.error('Supabase Auth validation failed', error)
    return null
  }
}
