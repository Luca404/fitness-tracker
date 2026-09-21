import { useEffect, useRef, useState } from 'react'
import { analyzeNutritionLabel } from '../../services/nutritionLabel'
import type { NutritionLabelAnalysis } from '../../services/nutritionLabel'

interface Props {
  onAnalysis: (analysis: NutritionLabelAnalysis) => void
  onCancel: () => void
  knownBarcode?: string | null
}

export default function NutritionLabelPhoto({ onAnalysis, onCancel, knownBarcode }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  function selectFile(nextFile: File | undefined) {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(nextFile ?? null)
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : null)
    setError(null)
  }

  async function analyze() {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      onAnalysis(await analyzeNutritionLabel(file, knownBarcode))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Analisi non riuscita.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-700 bg-gray-800/70 p-4">
        <h2 className="font-semibold">Foto della confezione</h2>
        <p className="mt-1 text-sm text-gray-400">
          {knownBarcode
            ? 'Il codice è già associato: fotografa da vicino la tabella nutrizionale, ben a fuoco e il più dritta possibile.'
            : 'Fotografa da vicino la tabella nutrizionale, ben a fuoco. Nome e barcode potranno essere completati dopo.'}
        </p>
        {knownBarcode && <p className="mt-2 text-xs text-primary-300">Codice già scansionato: {knownBarcode}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={event => selectFile(event.target.files?.[0])}
        className="sr-only"
        aria-label="Scegli foto etichetta nutrizionale"
      />

      {previewUrl ? (
        <div className="space-y-3">
          <img src={previewUrl} alt="Anteprima etichetta" className="max-h-80 w-full rounded-2xl bg-black/20 object-contain" />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={loading}
            className="w-full rounded-xl bg-gray-700 py-2.5 text-sm font-medium hover:bg-gray-600 disabled:opacity-50">
            Scegli un'altra foto
          </button>
          <button type="button" onClick={() => void analyze()} disabled={loading}
            className="w-full rounded-xl bg-primary-600 py-3 font-semibold hover:bg-primary-500 disabled:opacity-50">
            {loading ? 'Analizzo l’etichetta…' : 'Analizza etichetta'}
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()}
          className="w-full rounded-2xl border border-dashed border-primary-500/60 bg-primary-950/20 py-10 text-sm font-medium text-primary-300 hover:bg-primary-950/40">
          📸 Scatta o scegli una foto
        </button>
      )}

      {error && <p role="alert" className="rounded-xl bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
      <p className="text-xs text-gray-500">La foto viene compressa nel browser e non viene salvata nell’app.</p>
      <button type="button" onClick={onCancel} disabled={loading} className="w-full text-center text-sm text-gray-500 disabled:opacity-50">
        Annulla
      </button>
    </div>
  )
}
