import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { functionErrorMessage, prepareImage } from './photoUpload'

describe('phone photo preparation', () => {
  let decodeFails: boolean
  let dimensions: [number, number] | undefined
  const drawImage = vi.fn()
  const encodedJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])

  beforeEach(() => {
    decodeFails = false
    dimensions = undefined
    drawImage.mockClear()
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = vi.fn().mockReturnValue('blob:photo')
      static revokeObjectURL = vi.fn()
    })
    vi.stubGlobal('Image', class {
      naturalWidth = 2400
      naturalHeight = 1200
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) { queueMicrotask(() => decodeFails ? this.onerror?.() : this.onload?.()) }
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, callback, type) {
      dimensions = [this.width, this.height]
      callback(new Blob([encodedJpeg], { type }))
    })
  })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it.each(['image/jpeg', '', 'application/octet-stream', 'video/mp4'])(
    'reads a JPEG Motion Photo with MIME %s and sends only the re-encoded still', async type => {
      const file = new File([encodedJpeg, 'appended-video-and-audio'], 'meal.MP.JPG', { type })
      expect(await prepareImage(file)).toEqual({ base64: '/9j/2Q==', mimeType: 'image/jpeg' })
      expect(vi.mocked(URL.createObjectURL).mock.calls[0][0]).toMatchObject({ type: 'image/jpeg' })
      expect(dimensions).toEqual([1600, 800])
      expect(drawImage).toHaveBeenCalledOnce()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo')
    },
  )

  const ftyp = (brand: string) => new Uint8Array([
    0, 0, 0, 20, ...Array.from(`ftyp${brand}`).map(c => c.charCodeAt(0)),
    0, 0, 0, 0, ...Array.from('mif1').map(c => c.charCodeAt(0)),
  ])
  it.each([['heic', 'image/heic'], ['mif1', 'image/heif'], ['avif', 'image/avif']])(
    'accepts the still image in a %s phone container when the browser can decode it', async (brand, expectedType) => {
      const file = new File([ftyp(brand), 'photo-and-motion-data'], 'meal', { type: 'application/octet-stream' })
      expect((await prepareImage(file)).mimeType).toBe('image/jpeg')
      expect(vi.mocked(URL.createObjectURL).mock.calls[0][0]).toMatchObject({ type: expectedType })
    },
  )
  it('guides users to export a still if their browser cannot decode HEIC', async () => {
    decodeFails = true
    await expect(prepareImage(new File([ftyp('heic')], 'meal.HEIC'))).rejects.toThrow('esporta la foto o il fotogramma principale come JPEG')
    expect(drawImage).not.toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo')
  })
  it('uses the filename when a picker omits both a known header and MIME, then requires successful decoding', async () => {
    decodeFails = true
    await expect(prepareImage(new File(['corrupt'], 'meal.HEIF'))).rejects.toThrow('Questo browser non riesce ad aprire')
    expect(drawImage).not.toHaveBeenCalled()
  })
  it.each([
    new File(['video'], 'IMG_001.MOV', { type: 'video/quicktime' }),
    new File([new Uint8Array([0, 0, 0, 16]), 'ftypisom', '0000'], 'renamed.jpg', { type: 'image/jpeg' }),
  ])('rejects a video without trying to analyse an arbitrary frame', async file => {
    await expect(prepareImage(file)).rejects.toThrow('Hai selezionato un video')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    expect(drawImage).not.toHaveBeenCalled()
  })
  it('rejects empty, excessive and unsupported files before decoding', async () => {
    await expect(prepareImage(new File([], 'empty.jpg'))).rejects.toThrow('vuoto')
    const excessive = new File([encodedJpeg], 'large.MP.JPG', { type: 'image/jpeg' })
    Object.defineProperty(excessive, 'size', { value: 16 * 1024 * 1024 })
    await expect(prepareImage(excessive)).rejects.toThrow('esporta solo la parte fotografica')
    await expect(prepareImage(new File(['<svg/>'], 'image.svg', { type: 'image/svg+xml' }))).rejects.toThrow('Formato non supportato')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
})

describe('photo analysis error messages', () => {
  it('preserves the actionable server error', async () => {
    const error = { context: new Response(JSON.stringify({ error: 'Chiave OpenAI non valida.' }), { status: 503 }) }
    expect(await functionErrorMessage(error)).toBe('Chiave OpenAI non valida.')
  })
  it.each([
    [401, 'Accedi di nuovo'], [413, 'troppo grande'], [429, 'Attendi un minuto'],
    [504, 'troppo tempo'], [502, 'temporaneamente non disponibile'],
  ])('explains non-JSON gateway status %s', async (status, expected) => {
    expect(await functionErrorMessage({ context: new Response('<html>Error</html>', { status }) })).toContain(expected)
  })
  it('distinguishes connection failures and keeps a caller fallback for unknown errors', async () => {
    expect(await functionErrorMessage({ name: 'FunctionsFetchError' })).toContain('connessione a Internet')
    expect(await functionErrorMessage(null, 'Errore di conferma.')).toBe('Errore di conferma.')
  })
})
