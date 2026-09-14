import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import type { IScannerControls } from '@zxing/browser'

interface Props {
  onScan: (code: string) => void
  onCancel: () => void
}

export default function BarcodeScanner({ onScan, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    let cancelled = false
    let controlsRef: IScannerControls | null = null

    reader.decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result, _err, controls) => {
      if (cancelled || !result) return
      controls.stop()
      onScan(result.getText())
    }).then(controls => {
      if (cancelled) { controls.stop(); return }
      controlsRef = controls
    }).catch(() => {
      if (!cancelled) setError('Impossibile accedere alla fotocamera.')
    })

    return () => {
      cancelled = true
      controlsRef?.stop()
    }
  }, [onScan])

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-sm text-orange-400 text-center py-6">{error}</p>
      ) : (
        <video ref={videoRef} className="w-full rounded-lg bg-black aspect-video" muted />
      )}
      <p className="text-xs text-gray-500 text-center">Inquadra il codice a barre del prodotto</p>
      <button type="button" onClick={onCancel}
        className="w-full py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm">
        Annulla
      </button>
    </div>
  )
}
