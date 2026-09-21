import { describe, expect, it } from 'vitest'
import { normalizeBarcode } from './barcodeProducts'

describe('normalizeBarcode', () => {
  it('accepts common GTIN lengths and removes visual separators', () => {
    expect(normalizeBarcode('8000500310427')).toBe('8000500310427')
    expect(normalizeBarcode('8000 5003-10427')).toBe('8000500310427')
    expect(normalizeBarcode('12345678')).toBe('12345678')
  })

  it('rejects non-numeric and unsupported identifiers', () => {
    expect(normalizeBarcode('ABC-12345678')).toBeNull()
    expect(normalizeBarcode('1234567')).toBeNull()
    expect(normalizeBarcode('')).toBeNull()
  })
})
