const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'] as const
export const PHOTO_INPUT_ACCEPT = `${SUPPORTED_IMAGE_TYPES.join(',')},.jpg,.jpeg,.png,.webp,.heic,.heif,.avif`
const MAX_SOURCE_BYTES = 15 * 1024 * 1024
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const MAX_IMAGE_EDGE = 1600

type PreparedImage = {
  base64: string
  mimeType: 'image/jpeg'
}

type ImageType = (typeof SUPPORTED_IMAGE_TYPES)[number]

function readHeader(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(new Error('Non riesco a leggere la foto. Prova a esportarla dalla galleria e selezionarla di nuovo.'))
    reader.readAsArrayBuffer(file.slice(0, 512))
  })
}

async function photoBlob(file: File): Promise<{ blob: Blob; type: ImageType }> {
  const header = await readHeader(file)
  const text = (start: number, end: number) => String.fromCharCode(...header.slice(start, end))
  let type: ImageType | undefined
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) type = 'image/jpeg'
  else if (text(0, 8) === '\x89PNG\r\n\x1a\n') type = 'image/png'
  else if (text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP') type = 'image/webp'
  else if (text(4, 8) === 'ftyp') {
    // HEIF/AVIF and video share an ISO BMFF container. Check only ftyp brands,
    // never arbitrary metadata or the appended Motion Photo video.
    const size = new DataView(header.buffer).getUint32(0)
    const brands = [text(8, 12)]
    for (let offset = 16; offset + 4 <= Math.min(size, header.length); offset += 4) brands.push(text(offset, offset + 4))
    if (brands.some(brand => ['avif', 'avis'].includes(brand))) type = 'image/avif'
    else if (brands.some(brand => ['heic', 'heix', 'hevc', 'hevx'].includes(brand))) type = 'image/heic'
    else if (brands.some(brand => ['mif1', 'msf1'].includes(brand))) type = 'image/heif'
    if (!type) throw new Error('Hai selezionato un video. Per una Live Photo o Motion Photo scegli la parte fotografica nella galleria oppure esporta un fotogramma come JPEG.')
  }
  if (!type && (file.type.startsWith('video/') || /\.(mov|mp4|m4v|webm)$/i.test(file.name))) {
    throw new Error('Hai selezionato un video. Per una Live Photo o Motion Photo scegli la parte fotografica nella galleria oppure esporta un fotogramma come JPEG.')
  }
  // Some phone pickers omit the MIME type. A declared type/extension is a
  // fallback only; the browser must still decode an actual image successfully.
  if (!type && SUPPORTED_IMAGE_TYPES.includes(file.type as ImageType)) type = file.type as ImageType
  if (!type && (!file.type || file.type === 'application/octet-stream')) {
    const extension = file.name.split('.').pop()?.toLowerCase()
    const extensions: Record<string, ImageType> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', avif: 'image/avif' }
    type = extensions[extension ?? '']
  }
  if (!type) throw new Error('Formato non supportato. Scegli una foto JPEG, PNG, WebP, HEIC/HEIF o AVIF. Per una foto in movimento, seleziona la parte fotografica.')
  return { blob: file.slice(0, file.size, type), type }
}

function loadImage(file: Blob, type: ImageType): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      if (image.naturalWidth > 0 && image.naturalHeight > 0) resolve(image)
      else reject(new Error('La foto non contiene un’immagine leggibile. Esporta un fotogramma come JPEG dalla galleria e riprova.'))
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(type === 'image/heic' || type === 'image/heif' || type === 'image/avif'
        ? 'Questo browser non riesce ad aprire la foto HEIC/HEIF o AVIF. Dalla galleria esporta la foto o il fotogramma principale come JPEG, poi riprova.'
        : 'Non riesco a leggere questa immagine. Se è una Live Photo o Motion Photo, esporta la parte fotografica come JPEG dalla galleria e riprova.'))
    }
    image.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Non riesco a preparare la foto.')),
      'image/jpeg',
      quality,
    )
  })
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const comma = result.indexOf(',')
      if (comma < 0) reject(new Error('Non riesco a codificare la foto.'))
      else resolve(result.slice(comma + 1))
    }
    reader.onerror = () => reject(new Error('Non riesco a leggere la foto.'))
    reader.readAsDataURL(blob)
  })
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (file.size === 0) throw new Error('Il file selezionato è vuoto. Scegli di nuovo la foto dalla galleria.')
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('La foto supera 15 MB. Se è una Live Photo o Motion Photo, esporta solo la parte fotografica come JPEG oppure scegli una foto più piccola.')
  }

  const source = await photoBlob(file)
  const image = await loadImage(source.blob, source.type)
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Il browser non può preparare la foto.')
  // Redrawing keeps just the still image: Motion Photo video, audio and
  // metadata are never included in the JPEG sent to the analysis service.
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  let blob = await canvasToBlob(canvas, 0.84)
  if (blob.size > MAX_UPLOAD_BYTES) blob = await canvasToBlob(canvas, 0.68)
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error('La foto resta troppo grande dopo la compressione. Prova a ritagliarla.')
  }

  return { base64: await blobToBase64(blob), mimeType: 'image/jpeg' }
}

export async function functionErrorMessage(error: unknown, fallback = 'Analisi non riuscita. Riprova tra poco.'): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context
  if (context instanceof Response) {
    try {
      const body = await context.clone().json() as { error?: unknown }
      if (typeof body.error === 'string' && body.error.trim()) return body.error
    } catch {
      // The function may have returned a non-JSON gateway error.
    }
    if (context.status === 401) return 'Sessione scaduta o non valida. Accedi di nuovo e riprova.'
    if (context.status === 413) return 'La foto è troppo grande per il server. Ritagliala o scegli un’immagine più piccola.'
    if (context.status === 429) return 'Troppe richieste di analisi. Attendi un minuto e riprova.'
    if (context.status === 504) return 'Il servizio ha impiegato troppo tempo. Riprova tra poco.'
    if (context.status >= 500) return 'Il servizio di analisi è temporaneamente non disponibile. Riprova tra poco.'
  }
  if ((error as { name?: string } | null)?.name === 'FunctionsFetchError') {
    return 'Non riesco a contattare il servizio di analisi. Controlla la connessione a Internet e riprova.'
  }
  return fallback
}
