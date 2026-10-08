const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MAX_SOURCE_BYTES = 15 * 1024 * 1024
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const MAX_IMAGE_EDGE = 1600

type PreparedImage = {
  base64: string
  mimeType: 'image/jpeg'
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Non riesco a leggere questa immagine.'))
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
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type as (typeof SUPPORTED_IMAGE_TYPES)[number])) {
    throw new Error('Formato non supportato. Usa una foto JPEG, PNG o WebP.')
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('La foto è troppo grande. Scegline una inferiore a 15 MB.')
  }

  const image = await loadImage(file)
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Il browser non può preparare la foto.')
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
  }
  return fallback
}

