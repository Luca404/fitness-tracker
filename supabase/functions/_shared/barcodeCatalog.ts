import { createClient } from 'npm:@supabase/supabase-js@2.103.2'

export type CatalogSource = 'openfoodfacts' | 'ai_photo'
export type CatalogConfidence = 'high' | 'medium' | 'low'

export type CatalogProductInput = {
  barcode: string
  name: string
  brand: string | null
  package_quantity: string | null
  quantity_value: number | null
  quantity_unit: 'g' | 'ml' | 'pz' | null
  serving_size: string | null
  ingredients: string | null
  allergens: string | null
  calories_100g: number
  protein_100g: number
  carbs_100g: number
  fat_100g: number
  fiber_100g: number | null
  sugars_100g: number | null
  saturated_fat_100g: number | null
  unsaturated_fat_100g: number | null
  salt_100g: number | null
  category: string
  source: CatalogSource
  off_food_id: string | null
  confidence: CatalogConfidence | null
  metadata: Record<string, unknown> | null
}

function getSecretKey(): string | null {
  const direct = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    || Deno.env.get('SUPABASE_SECRET_KEY')
  if (direct) return direct

  const encodedKeys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (!encodedKeys) return null
  try {
    const keys = JSON.parse(encodedKeys) as Record<string, unknown>
    const preferred = keys.default
    if (typeof preferred === 'string' && preferred) return preferred
    return Object.values(keys).find((value): value is string => typeof value === 'string' && value.length > 0) ?? null
  } catch {
    return null
  }
}

function getAdminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const secretKey = getSecretKey()
  if (!url || !secretKey) throw new Error('Supabase admin credentials are not configured')
  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function getCatalogProduct(barcode: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await getAdminClient()
    .from('barcode_products')
    .select('*')
    .eq('barcode', barcode)
    .maybeSingle()
  if (error) throw error
  return data as Record<string, unknown> | null
}

export async function upsertCatalogProduct(product: CatalogProductInput): Promise<Record<string, unknown>> {
  const client = getAdminClient()
  const { data: existing, error: lookupError } = await client
    .from('barcode_products')
    .select('source')
    .eq('barcode', product.barcode)
    .maybeSingle()
  if (lookupError) throw lookupError

  // Community/Open Food Facts data wins over an AI transcription. This also
  // prevents a later photo from degrading a catalog record already verified
  // against the external product database.
  if (product.source === 'ai_photo' && existing?.source === 'openfoodfacts') {
    const current = await getCatalogProduct(product.barcode)
    if (!current) throw new Error('Catalog product disappeared during update')
    return current
  }

  const { data, error } = await client
    .from('barcode_products')
    .upsert({ ...product, updated_at: new Date().toISOString() }, { onConflict: 'barcode' })
    .select()
    .single()
  if (error) throw error
  return data as Record<string, unknown>
}
