import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { supabase } from './supabase'
import type { BarcodeProduct } from '../types'

const CACHEABLE_BARCODE_LENGTHS = new Set([8, 12, 13, 14])

export function normalizeBarcode(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.replace(/[\s-]/g, '')
  if (!/^\d+$/.test(normalized) || !CACHEABLE_BARCODE_LENGTHS.has(normalized.length)) return null
  return normalized
}

export async function detectBarcodeInImage(file: File): Promise<string | null> {
  const hints = new Map<DecodeHintType, unknown>([[DecodeHintType.TRY_HARDER, true]])
  const reader = new BrowserMultiFormatReader(hints)
  reader.possibleFormats = [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.ITF,
  ]
  const url = URL.createObjectURL(file)
  try {
    const result = await reader.decodeFromImageUrl(url)
    return normalizeBarcode(result.getText())
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function getBarcodeProduct(barcode: string): Promise<BarcodeProduct | null> {
  const normalized = normalizeBarcode(barcode)
  if (!normalized) return null
  const { data, error } = await supabase
    .from('barcode_products')
    .select('*')
    .eq('barcode', normalized)
    .maybeSingle()
  if (error) throw error
  return data as BarcodeProduct | null
}

async function functionErrorMessage(error: unknown): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context
  if (context instanceof Response) {
    try {
      const body = await context.clone().json() as { error?: unknown }
      if (typeof body.error === 'string' && body.error.trim()) return body.error
    } catch {
      // The function may have returned a non-JSON gateway error.
    }
  }
  return 'Errore nel recupero dati prodotto.'
}

export async function resolveBarcodeProduct(value: string): Promise<BarcodeProduct | null> {
  const barcode = normalizeBarcode(value)
  if (!barcode) throw new Error('Codice a barre non valido')
  const { data, error } = await supabase.functions.invoke('resolve-barcode-product', {
    body: { barcode },
  })
  if (error) throw new Error(await functionErrorMessage(error))
  if (!data || typeof data !== 'object' || !('product' in data)) {
    throw new Error('La risposta ricevuta non è valida.')
  }
  const result = data as { product: BarcodeProduct | null; cache_hit?: boolean }
  return result.product ? { ...result.product, cache_hit: result.cache_hit === true } : null
}
