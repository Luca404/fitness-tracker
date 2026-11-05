import { useEffect, useEffectEvent, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { TutorialStep } from './tutorialSteps'
import { TUTORIAL_CHAPTERS } from './tutorialSteps'
import type { SpotlightRect } from './spotlightPosition'
import { revealTutorialTarget } from './tutorialScroll'

interface Props {
  step: TutorialStep
  index: number
  completed?: boolean
  onRecover?: () => void
  total: number
  onNext: () => void
  onBack: () => void
  onChapter: (chapter: number) => void
  onFinish: () => void
}

const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'

export default function TutorialSpotlight({ step, completed = false, index, total, onNext, onRecover = onNext, onBack, onChapter, onFinish }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const targetRef = useRef<HTMLElement | null>(null)
  const descriptionId = useId()
  const maskId = useId().replaceAll(':', '')
  const [coachHeight, setCoachHeight] = useState(212)
  const phase = `${step.id}:${completed ? 'complete' : 'action'}`
  const targetSelector = completed ? step.resultTarget ?? step.target : step.target
  const actionSelector = completed ? undefined : step.action
  const [measurement, setMeasurement] = useState<{ id: string; rect: SpotlightRect; width: number; height: number } | null>(null)
  const [unavailableId, setUnavailableId] = useState<string | null>(null)
  const active = measurement?.id === phase ? measurement : null
  const unavailable = unavailableId === phase
  const advance = useEffectEvent(onNext)
  const finish = useEffectEvent(onFinish)

  useLayoutEffect(() => {
    const card = cardRef.current
    if (!card) return
    const measure = () => {
      const height = Math.round(card.getBoundingClientRect().height) || 212
      setCoachHeight(previous => previous === height ? previous : height)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(card)
    measure()
    return () => observer.disconnect()
  }, [])

  // The page captures the previous root styles in its layout effect first.
  useEffect(() => {
    document.documentElement.style.setProperty('--tutorial-coach-height', `${coachHeight}px`)
  }, [coachHeight])

  useEffect(() => {
    let frame = 0
    let scrolled = false
    let focused = false
    let describedTarget: HTMLElement | null = null
    let previousDescription: string | null = null
    const resizeObserver = new ResizeObserver(schedule)

    function measure() {
      frame = 0
      const element = document.querySelector<HTMLElement>(targetSelector)
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
        revealTutorialTarget(element)
        scrolled = true
      }
      const bounds = element.getBoundingClientRect()
      const width = window.innerWidth
      const height = window.visualViewport?.height ?? window.innerHeight
      const value = `${height}px`
      if (document.documentElement.style.getPropertyValue('--tutorial-viewport-height') !== value) {
        document.documentElement.style.setProperty('--tutorial-viewport-height', value)
      }
      const left = Math.max(8, bounds.left - 6)
      const top = Math.max(8, bounds.top - 6)
      const rect = { left, top, width: Math.max(24, Math.min(bounds.right + 6, width - 8) - left),
        height: Math.max(24, Math.min(bounds.bottom + 6, height - 8) - top) }
      if (bounds.width > 4 && bounds.height > 4
        && bounds.left >= 0 && bounds.top >= 0 && bounds.right <= width && bounds.bottom <= height) {
        // At viewport edges reduce both sides equally, keeping the outline
        // centered on the control rather than clipping only its outer edge.
        const paddingX = Math.min(6, bounds.left - 2, width - 2 - bounds.right)
        const paddingY = Math.min(6, bounds.top - 2, height - 2 - bounds.bottom)
        Object.assign(rect, { left: bounds.left - paddingX, top: bounds.top - paddingY,
          width: bounds.width + paddingX * 2, height: bounds.height + paddingY * 2 })
      }
      setMeasurement(previous => {
        if (previous?.id === phase && previous.width === width && previous.height === height
          && Object.entries(rect).every(([key, value]) => previous.rect[key as keyof SpotlightRect] === value)) return previous
        return { id: phase, rect, width, height }
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
      if (!document.querySelector(targetSelector)) setUnavailableId(phase)
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
  }, [phase, targetSelector, descriptionId, coachHeight])

  useEffect(() => {
    let queued = false
    let pendingAdvance = 0
    function allowed(target: EventTarget | null) {
      if (!(target instanceof Element)) return false
      if (cardRef.current?.contains(target)) return true
      if (actionSelector && target.closest(actionSelector)) return true
      // Forms remain editable, while unrelated actions (including camera and deletion) are blocked.
      const fields = !completed && step.fields ? document.querySelector(step.fields) : targetRef.current
      return Boolean(fields?.contains(target) && target.closest('input, select, textarea, label'))
    }
    function pointer(event: Event) {
      if (event.target instanceof Element && event.target.closest(focusableSelector) && !allowed(event.target)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    function click(event: MouseEvent) {
      if (!allowed(event.target)) { event.preventDefault(); event.stopPropagation(); return }
      if (!queued && !step.waitFor && actionSelector && event.target instanceof Element
        && event.target.closest(actionSelector) && !event.target.closest(':disabled')
        && !cardRef.current?.contains(event.target)) {
        // Let the actual control run first. The demo router handles links;
        // the guide never substitutes a navigation or a programmatic click.
        queued = true
        // A browser can flush microtasks between capture and React's bubble
        // handler. Advance in the next task, after the real click has completed.
        pendingAdvance = window.setTimeout(() => advance(), 0)
      }
    }
    function keyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        finish()
        return
      }
      if (event.key !== 'Tab') return
      const action = actionSelector ? document.querySelector<HTMLElement>(actionSelector) : null
      const fieldRegion = !completed && step.fields ? document.querySelector(step.fields) : targetRef.current
      const fields = [...(fieldRegion?.querySelectorAll<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled])') ?? [])]
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
      clearTimeout(pendingAdvance)
      document.removeEventListener('pointerdown', pointer, true)
      document.removeEventListener('click', click, true)
      document.removeEventListener('keydown', keyboard, true)
    }
  }, [phase, actionSelector, completed, step.fields, step.waitFor])

  return createPortal(
    <div className="tutorial-overlay fixed inset-0 z-[200] pointer-events-none">
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs><mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          {active && <rect {...{ x: active.rect.left, y: active.rect.top, width: active.rect.width, height: active.rect.height }} rx="16" fill="black" />}
        </mask></defs>
        <rect width="100%" height="100%" fill="rgb(2 6 16 / 22%)" mask={`url(#${maskId})`} />
      </svg>
      {active && <div aria-hidden="true" className="tutorial-spotlight absolute rounded-2xl border-2 border-primary-300"
        style={{ left: active.rect.left, top: active.rect.top, width: active.rect.width, height: active.rect.height }} />}
      <div ref={cardRef} role="region" aria-label="Tutorial interattivo" data-tour-coach
        className="tutorial-coach pointer-events-auto fixed flex flex-col overflow-hidden border-gray-700 bg-gray-900 text-white shadow-xl shadow-black/30">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-700/70 px-4 py-1.5">
          <select aria-label="Argomento del tutorial" value={step.chapter} onChange={event => onChapter(Number(event.target.value))}
            className="min-h-9 min-w-0 max-w-[70%] rounded-lg bg-transparent pr-2 text-sm font-semibold text-primary-300 outline-none focus-visible:ring-2 focus-visible:ring-primary-400">
            {TUTORIAL_CHAPTERS.map((chapter, chapterIndex) => <option key={chapter} value={chapterIndex} className="bg-gray-800">{chapterIndex + 1}. {chapter}</option>)}
          </select>
          <button type="button" onClick={onFinish} className="min-h-10 rounded-xl px-3 text-sm text-gray-300 hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400">Salta</button>
        </div>
        <div className="min-h-0 overflow-y-auto px-4 py-3">
          <h2 ref={headingRef} tabIndex={-1} className="text-lg font-bold leading-tight outline-none">{completed ? step.completedTitle ?? step.title : step.title}</h2>
          <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-gray-300">{completed ? step.completedDescription ?? step.description : step.description}</p>
          {unavailable && !active && <p role="status" className="mt-3 text-xs text-amber-200">Questo elemento non è disponibile. Puoi passare alla tappa successiva.</p>}
          {index === 0 && <p className="mt-2 text-xs text-gray-400">Dati di esempio · niente viene salvato nel tuo account</p>}
        </div>
        <div className="shrink-0 border-t border-gray-700/70 px-4 py-2">
          <div className="mb-2 flex items-center gap-3">
            <div role="progressbar" aria-label="Avanzamento tutorial" aria-valuemin={1} aria-valuemax={total} aria-valuenow={index + 1}
              className="h-1 flex-1 overflow-hidden rounded-full bg-gray-700">
              <div className="h-full rounded-full bg-primary-400 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${(index + 1) / total * 100}%` }} />
            </div>
            <span className="text-xs tabular-nums text-gray-400">{index + 1} / {total}</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onBack} disabled={index === 0}
              className="btn-secondary min-h-11 px-3 text-sm disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400">Indietro</button>
            {actionSelector && !unavailable ? (
              <p className="flex min-h-11 min-w-0 flex-1 items-center justify-end gap-2 text-right text-sm font-semibold text-primary-300">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0" aria-hidden="true"><path d="m5 3 14 9-7 1-3 7-4-17Z" /></svg>
                {step.actionLabel ?? 'Tocca il pulsante evidenziato'}
              </p>
            ) : (
              <button type="button" onClick={unavailable && !active ? onRecover : onNext} disabled={!active && !unavailable}
                className="btn-primary min-h-11 min-w-0 flex-1 text-sm disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400">
                {unavailable && !active ? 'Salta passaggio' : completed ? 'Continua' : step.nextLabel ?? 'Avanti'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>, document.body,
  )
}
