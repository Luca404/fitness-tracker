import { useEffect, useRef, useState } from 'react'
import { DICTATION_FORMATS, DICTATION_MAX_BYTES, DICTATION_MAX_SECONDS } from '../../supabase/functions/_shared/fitnessDictation'
import { transcribeFitnessChat } from '../services/fitnessChat'

type Phase = 'idle' | 'permission' | 'recording' | 'transcribing'
type Capture = {
  controller: AbortController
  stream?: MediaStream
  recorder?: MediaRecorder
  timer?: ReturnType<typeof setTimeout>
}

function releaseMicrophone(capture: Capture) {
  clearTimeout(capture.timer)
  capture.stream?.getTracks().forEach(track => track.stop())
}

function discard(capture: Capture | null) {
  if (!capture) return
  capture.controller.abort()
  if (capture.recorder?.state === 'recording') capture.recorder.stop()
  releaseMicrophone(capture)
}

export function useFitnessDictation(onText: (text: string) => void, onError: (message: string) => void) {
  const [phase, setPhase] = useState<Phase>('idle')
  const active = useRef<Capture | null>(null)
  const format = typeof globalThis.MediaRecorder?.isTypeSupported === 'function' && typeof navigator.mediaDevices?.getUserMedia === 'function'
    ? Object.keys(DICTATION_FORMATS).find(type => MediaRecorder.isTypeSupported(type))
    : undefined

  useEffect(() => () => {
    discard(active.current)
    active.current = null
  }, [])

  function cancel() {
    discard(active.current)
    active.current = null
    setPhase('idle')
  }

  async function start() {
    if (!format || active.current) return
    const capture: Capture = { controller: new AbortController() }
    const { signal } = capture.controller
    active.current = capture
    onError('')
    setPhase('permission')

    try {
      capture.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (signal.aborted) {
        releaseMicrophone(capture)
        return
      }

      const recorder = new MediaRecorder(capture.stream, { mimeType: format })
      capture.recorder = recorder
      const chunks: Blob[] = []
      recorder.ondataavailable = event => {
        if (!signal.aborted && event.data.size) chunks.push(event.data)
      }
      recorder.onerror = () => {
        if (signal.aborted) return
        cancel()
        onError('La registrazione si è interrotta. Riprova o scrivi il messaggio.')
      }
      recorder.onstop = async () => {
        releaseMicrophone(capture)
        if (signal.aborted) return
        setPhase('transcribing')
        try {
          const audio = new Blob(chunks, { type: recorder.mimeType || format })
          if (!audio.size) throw new Error('La registrazione è vuota. Riprova.')
          if (audio.size > DICTATION_MAX_BYTES) throw new Error('La registrazione è troppo grande. Prova con una frase più breve.')
          const text = await transcribeFitnessChat(audio, signal)
          if (!signal.aborted) onText(text)
        } catch (error) {
          if (!signal.aborted && error instanceof Error) onError(error.message)
        } finally {
          if (!signal.aborted) {
            active.current = null
            setPhase('idle')
          }
        }
      }
      recorder.start()
      capture.timer = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop()
      }, DICTATION_MAX_SECONDS * 1000)
      setPhase('recording')
    } catch (error) {
      if (signal.aborted) return
      cancel()
      const name = error instanceof DOMException ? error.name : ''
      onError(name === 'NotAllowedError'
        ? 'Consenti l’accesso al microfono nelle impostazioni del browser o scrivi il messaggio.'
        : 'Non riesco ad accedere al microfono. Controlla che sia disponibile o scrivi il messaggio.')
    }
  }

  function stop() {
    const recorder = active.current?.recorder
    if (recorder?.state === 'recording') recorder.stop()
  }

  return { available: Boolean(format), phase, busy: phase !== 'idle', start, stop, cancel }
}
