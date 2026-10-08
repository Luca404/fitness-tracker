import { useEffect, useRef, useState } from 'react'
import { analyzeMealPhoto, mealPhotoItems, type MealPhotoAnalysis } from '../../services/mealPhoto'
import type { DishItemDraft } from '../../types'
import MealPhotoReview from './MealPhotoReview'

interface Props {
  onSave: (name: string, items: DishItemDraft[]) => Promise<void>
  onCancel: () => void
}

export default function MealPhotoCapture({ onSave, onCancel }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const analysisLock = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<MealPhotoAnalysis | null>(null)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  function selectFile(next: File | undefined) {
    if (!next) return
    setFile(next)
    setPreview(URL.createObjectURL(next))
    setError(null)
    setAnalysis(null)
  }

  async function analyze() {
    if (!file || analysisLock.current) return
    analysisLock.current = true
    setLoading(true)
    setError(null)
    try { setAnalysis(await analyzeMealPhoto(file, description)) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Analisi non riuscita. Riprova.') }
    finally { analysisLock.current = false; setLoading(false) }
  }

  if (analysis) return <MealPhotoReview initialName={analysis.name} initialItems={mealPhotoItems(analysis)}
    analysis={analysis} onSave={onSave} onCancel={() => setAnalysis(null)} />

  return <div className="space-y-4">
    <p className="text-sm text-gray-400">Fotografa il piatto intero, ben visibile. Puoi aggiungere il nome o la descrizione del menù per aiutare la stima.</p>
    <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
      disabled={loading} aria-label="Scatta foto del piatto" className="sr-only"
      onChange={event => { selectFile(event.target.files?.[0]); event.target.value = '' }} />
    <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp"
      disabled={loading} aria-label="Scegli foto del piatto" className="sr-only"
      onChange={event => { selectFile(event.target.files?.[0]); event.target.value = '' }} />
    {preview && <img src={preview} alt="Anteprima del piatto" className="max-h-72 w-full rounded-2xl bg-black/20 object-contain" />}
    <div className="grid grid-cols-2 gap-3">
      <button type="button" onClick={() => cameraRef.current?.click()} disabled={loading}
        className="rounded-2xl border border-primary-500/40 bg-primary-950/20 px-3 py-4 text-sm font-medium text-primary-300 disabled:opacity-40">📸 Scatta foto</button>
      <button type="button" onClick={() => galleryRef.current?.click()} disabled={loading}
        className="rounded-2xl border border-gray-700 px-3 py-4 text-sm font-medium text-gray-300 disabled:opacity-40">Scegli dalla galleria</button>
    </div>
    <label className="block text-xs text-gray-400">Descrizione del piatto (facoltativa)
      <textarea value={description} maxLength={1000} disabled={loading} rows={3}
        onChange={event => setDescription(event.target.value)} placeholder="Es. Risotto ai funghi con parmigiano, dal menù del ristorante"
        className="mt-1 w-full resize-y rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white outline-none focus:border-primary-500" />
    </label>
    <p className="text-xs leading-relaxed text-gray-500">La foto viene compressa e inviata a OpenAI per l’analisi; non viene salvata nell’app. Controlla la stima prima di registrarla.</p>
    {error && <p role="alert" className="rounded-xl bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
    <button type="button" onClick={() => void analyze()} disabled={!file || loading}
      className="w-full rounded-xl bg-primary-600 py-3 font-semibold hover:bg-primary-500 disabled:opacity-40">
      {loading ? 'Sto stimando il piatto…' : 'Analizza piatto'}
    </button>
    <button type="button" onClick={onCancel} disabled={loading} className="w-full py-2 text-sm text-gray-400 disabled:opacity-40">← Torna a Occasionale</button>
  </div>
}
