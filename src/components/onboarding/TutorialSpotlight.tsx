import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { TutorialStep } from './tutorialSteps'
import { TUTORIAL_CHAPTERS } from './tutorialSteps'
import { spotlightCardHeight, spotlightPosition, type SpotlightRect } from './spotlightPosition'

interface Props {
  step: TutorialStep
  index: number
  total: number
  onNext: () => void
  onBack: () => void
  onChapter: (chapter: number) => void
  onFinish: () => void
}

const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'

export default function TutorialSpotlight({ step, index, total, onNext, onBack, onChapter, onFinish }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const targetRef = useRef<HTMLElement | null>(null)
  const descriptionId = useId()
  const maskId = useId().replaceAll(':', '')
  const [cardHeight, setCardHeight] = useState(300)
  const [measurement, setMeasurement] = useState<{ id: string; rect: SpotlightRect; width: number; height: number } | null>(null)
  const [unavailableId, setUnavailableId] = useState<string | null>(null)
  const [validationHint, setValidationHint] = useState(false)
  const active = measurement?.id === step.id ? measurement : null
  const unavailable = unavailableId === step.id

  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const measure = () => setCardHeight(card.getBoundingClientRect().height || 300)
    const observer = new ResizeObserver(measure)
    observer.observe(card)
    measure()
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let frame = 0
    let scrolled = false
    let focused = false
    let describedTarget: HTMLElement | null = null
    let previousDescription: string | null = null
    const resizeObserver = new ResizeObserver(schedule)

    function measure() {
      frame = 0
      const element = document.querySelector<HTMLElement>(step.target)
      targetRef.current = element
      if (!element) return
      if (describedTarget !== element) {
        if (describedTarget) {
          if (previousDescription === null) describedTarget.removeAttribute('aria-describedby')
          else describedTarget.setAttribute('aria-describedby', previousDescription)
          resizeObserver.unobserve(describedTarget)
        }
        describedTarget = element
        previousDescription = element.getAttribute('aria-describedby')
        element.setAttribute('aria-describedby', [previousDescription, descriptionId].filter(Boolean).join(' '))
        resizeObserver.observe(element)
      }
      if (!scrolled) {
        element.scrollIntoView?.({ block: 'start', inline: 'nearest', behavior: 'instant' })
        scrolled = true
      }
      const bounds = element.getBoundingClientRect()
      const width = window.innerWidth
      const height = window.visualViewport?.height ?? window.innerHeight
      const left = Math.max(8, bounds.left - 6)
      const top = Math.max(8, bounds.top - 6)
      const rect = { left, top, width: Math.max(24, Math.min(bounds.right + 6, width - 8) - left),
        height: Math.max(24, Math.min(bounds.bottom + 6, height - 8) - top) }
      setMeasurement(previous => {
        if (previous?.id === step.id && previous.width === width && previous.height === height
          && Object.entries(rect).every(([key, value]) => previous.rect[key as keyof SpotlightRect] === value)) return previous
        return { id: step.id, rect, width, height }
      })
      if (!focused) {
        headingRef.current?.focus({ preventScroll: true })
        focused = true
      }
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(measure) }
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { subtree: true, childList: true, attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'disabled'] })
    const timeout = window.setTimeout(() => {
      if (!document.querySelector(step.target)) setUnavailableId(step.id)
    }, 8000)
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, true)
    window.visualViewport?.addEventListener('resize', schedule)
    schedule()
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timeout)
      observer.disconnect()
      resizeObserver.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
      window.visualViewport?.removeEventListener('resize', schedule)
      if (describedTarget) {
        if (previousDescription === null) describedTarget.removeAttribute('aria-describedby')
        else describedTarget.setAttribute('aria-describedby', previousDescription)
      }
      targetRef.current = null
    }
  }, [step.id, step.target, descriptionId])

  useEffect(() => {
    function allowed(target: EventTarget | null) {
      if (!(target instanceof Element)) return false
      if (cardRef.current?.contains(target)) return true
      if (step.action && target.closest(step.action)) return true
      // Forms remain editable, while unrelated actions (including camera and deletion) are blocked.
      return Boolean(targetRef.current?.contains(target) && target.closest('input, select, textarea, label'))
    }
    function pointer(event: Event) {
      if (event.target instanceof Element && event.target.closest(focusableSelector) && !allowed(event.target)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    function click(event: MouseEvent) {
      if (!allowed(event.target)) { event.preventDefault(); event.stopPropagation(); return }
      if (!step.waitFor && step.action && event.target instanceof Element && event.target.closest(step.action)
        && !cardRef.current?.contains(event.target)) {
        queueMicrotask(onNext)
      }
    }
    function keyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onFinish()
        return
      }
      if (event.key !== 'Tab') return
      const action = step.action ? document.querySelector<HTMLElement>(step.action) : null
      const fields = [...(targetRef.current?.querySelectorAll<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled])') ?? [])]
      const items = [...fields, ...(action && !action.hasAttribute('disabled') ? [action] : []),
        ...cardRef.current!.querySelectorAll<HTMLElement>(focusableSelector)]
        .filter((item, itemIndex, all) => all.indexOf(item) === itemIndex)
      if (items.length === 0) return
      event.preventDefault()
      event.stopPropagation()
      const currentIndex = items.indexOf(document.activeElement as HTMLElement)
      const nextIndex = currentIndex < 0 ? (event.shiftKey ? items.length - 1 : 0)
        : (currentIndex + (event.shiftKey ? -1 : 1) + items.length) % items.length
      items[nextIndex].focus()
    }
    document.addEventListener('pointerdown', pointer, true)
    document.addEventListener('click', click, true)
    document.addEventListener('keydown', keyboard, true)
    return () => {
      document.removeEventListener('pointerdown', pointer, true)
      document.removeEventListener('click', click, true)
      document.removeEventListener('keydown', keyboard, true)
    }
  }, [step.action, step.waitFor, onNext, onFinish])

  function next() {
    if (!step.action || unavailable) { onNext(); return }
    const action = document.querySelector<HTMLButtonElement>(step.action)
    if (action && !action.disabled) action.click()
    else setValidationHint(true)
  }

  const position = active
    ? spotlightPosition(active.rect, { width: active.width, height: active.height }, cardHeight)
    : { width: 'min(360px, calc(100vw - 32px))', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
  const availableHeight = active ? spotlightCardHeight(active.rect, { width: active.width, height: active.height }) : window.innerHeight - 32

  return createPortal(
    <div className="tutorial-overlay fixed inset-0 z-[200] pointer-events-none">
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs><mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          {active && <rect {...{ x: active.rect.left, y: active.rect.top, width: active.rect.width, height: active.rect.height }} rx="16" fill="black" />}
        </mask></defs>
        <rect width="100%" height="100%" fill="rgb(2 6 16 / 78%)" mask={`url(#${maskId})`} />
      </svg>
      {active && <div aria-hidden="true" className="tutorial-spotlight absolute rounded-2xl border-2 border-primary-300"
        style={{ left: active.rect.left, top: active.rect.top, width: active.rect.width, height: active.rect.height }} />}
      <div ref={cardRef} role="region" aria-label="Tutorial interattivo" data-tour-coach
        className="tutorial-coach pointer-events-auto fixed flex max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-32px)] flex-col overflow-hidden rounded-3xl border border-gray-600/80 bg-gray-800 text-white shadow-2xl shadow-black/60"
        style={{ ...position, maxHeight: `min(${availableHeight}px, calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 32px))`, top: typeof position.top === 'number'
          ? `max(${position.top}px, calc(env(safe-area-inset-top) + 8px))` : position.top }}>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-700/70 px-5 py-3">
          <select aria-label="Argomento del tutorial" value={step.chapter} onChange={event => onChapter(Number(event.target.value))}
            className="min-h-10 min-w-0 max-w-[65%] rounded-lg bg-transparent pr-2 text-sm font-semibold text-primary-300 outline-none focus-visible:ring-2 focus-visible:ring-primary-400">
            {TUTORIAL_CHAPTERS.map((chapter, chapterIndex) => <option key={chapter} value={chapterIndex} className="bg-gray-800">{chapterIndex + 1}. {chapter}</option>)}
          </select>
          <button type="button" onClick={onFinish} className="min-h-11 rounded-xl px-3 text-sm text-gray-300 hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400">Salta</button>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 pb-4 pt-4">
          <h2 ref={headingRef} tabIndex={-1} className="text-xl font-bold leading-tight outline-none">{step.title}</h2>
          <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-gray-300">{step.description}</p>
          {unavailable && !active && <p role="status" className="mt-3 text-xs text-amber-200">Questo elemento non è disponibile. Puoi passare alla tappa successiva.</p>}
          {validationHint && <p role="status" className="mt-3 text-xs text-amber-200">Controlla i valori del modulo per continuare, oppure salta il tutorial.</p>}
          <p className="mt-3 text-xs text-gray-400">Dati di esempio · il tuo diario resta invariato</p>
        </div>
        <div className="shrink-0 border-t border-gray-700/70 px-5 pb-4 pt-3">
          <div className="mb-3 flex items-center gap-3">
            <div role="progressbar" aria-label="Avanzamento tutorial" aria-valuemin={1} aria-valuemax={total} aria-valuenow={index + 1}
              className="h-1 flex-1 overflow-hidden rounded-full bg-gray-700">
              <div className="h-full rounded-full bg-primary-400 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${(index + 1) / total * 100}%` }} />
            </div>
            <span className="text-xs tabular-nums text-gray-400">{index + 1} / {total}</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onBack} disabled={index === 0}
              className="btn-secondary min-h-12 px-3 text-sm disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400">Indietro</button>
            <button type="button" onClick={next} disabled={!active && !unavailable}
              className="btn-primary min-h-12 min-w-0 flex-1 text-sm disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400">
              {unavailable && !active ? 'Prosegui' : step.nextLabel ?? 'Avanti'}
            </button>
          </div>
        </div>
      </div>
    </div>, document.body,
  )
}
