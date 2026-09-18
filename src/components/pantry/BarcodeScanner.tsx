import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat } from '@zxing/library'
import type { IScannerControls } from '@zxing/browser'

interface Props {
  onScan: (code: string) => void
  onCancel: () => void
}

export default function BarcodeScanner({ onScan, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onScanRef = useRef(onScan)
  const hasScannedRef = useRef(false)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanStatus, setScanStatus] = useState<'waiting' | 'success'>('waiting')

  // Keep the scanner alive if the parent re-renders while a lookup is in progress.
  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    const reader = new BrowserMultiFormatReader(undefined, {
      // ZXing defaults to 500 ms between attempts. A shorter interval makes the
      // scanner feel much more responsive without continuously maxing out the CPU.
      delayBetweenScanAttempts: 120,
      tryPlayVideoTimeout: 5_000,
    })
    reader.possibleFormats = [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.ITF,
    ]

    let cancelled = false
    let controlsRef: IScannerControls | null = null

    reader.decodeFromConstraints(
      {
        audio: false,
        video: {
          // Product barcodes are normally scanned with the rear camera.
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      videoRef.current ?? undefined,
      (result, _err, controls) => {
        if (cancelled || hasScannedRef.current || !result) return
        hasScannedRef.current = true
        setScanStatus('success')
        controls.stop()
        // Leave the green confirmation visible briefly before the parent opens
        // the product details view.
        successTimerRef.current = setTimeout(() => {
          onScanRef.current(result.getText())
        }, 220)
      },
    ).then(controls => {
      if (cancelled) { controls.stop(); return }
      controlsRef = controls
    }).catch(() => {
      if (!cancelled) setError('Impossibile accedere alla fotocamera.')
    })

    return () => {
      cancelled = true
      controlsRef?.stop()
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-sm text-orange-400 text-center py-6">{error}</p>
      ) : (
        <div className="relative overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            className="w-full aspect-video object-cover"
            autoPlay
            muted
            playsInline
          />
        </div>
      )}
      <p className={`text-xs text-center ${scanStatus === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
        {scanStatus === 'success' ? 'Codice riconosciuto' : 'Codice non ancora riconosciuto'}
      </p>
      <button type="button" onClick={onCancel}
        className="w-full py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm">
        Annulla
      </button>
    </div>
  )
}
