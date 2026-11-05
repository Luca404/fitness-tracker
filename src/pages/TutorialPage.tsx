import { useEffect, useLayoutEffect } from 'react'
import { MemoryRouter } from 'react-router-dom'
import QuickTutorial from '../components/onboarding/QuickTutorial'
import { SettingsProvider } from '../contexts/SettingsContext'
import { resetDocumentScroll } from '../components/onboarding/tutorialScroll'

export default function TutorialPage({ onFinish }: { onFinish: () => void }) {
  useLayoutEffect(() => {
    const bodyOverflow = document.body.style.overflow
    const rootOverflow = document.documentElement.style.overflow
    const root = document.documentElement
    const previousTutorial = root.getAttribute('data-tutorial')
    const previousCoachHeight = root.style.getPropertyValue('--tutorial-coach-height')
    const previousViewportHeight = root.style.getPropertyValue('--tutorial-viewport-height')
    resetDocumentScroll()
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    root.setAttribute('data-tutorial', 'active')
    return () => {
      document.body.style.overflow = bodyOverflow
      document.documentElement.style.overflow = rootOverflow
      if (previousTutorial === null) root.removeAttribute('data-tutorial')
      else root.setAttribute('data-tutorial', previousTutorial)
      for (const [name, value] of [['--tutorial-coach-height', previousCoachHeight], ['--tutorial-viewport-height', previousViewportHeight]]) {
        if (value) root.style.setProperty(name, value)
        else root.style.removeProperty(name)
      }
      resetDocumentScroll()
    }
  }, [])

  useEffect(() => {
    window.addEventListener('popstate', onFinish)
    return () => window.removeEventListener('popstate', onFinish)
  }, [onFinish])

  // This router replaces the application router while the guide is open.
  // Page changes never enter browser history or leave the in-memory demo.
  return (
    <MemoryRouter initialEntries={['/meals']}>
      <SettingsProvider><QuickTutorial onFinish={onFinish} /></SettingsProvider>
    </MemoryRouter>
  )
}
