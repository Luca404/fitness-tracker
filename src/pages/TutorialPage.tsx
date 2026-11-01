import { useEffect, useLayoutEffect } from 'react'
import { MemoryRouter } from 'react-router-dom'
import QuickTutorial from '../components/onboarding/QuickTutorial'
import { SettingsProvider } from '../contexts/SettingsContext'
import { resetDocumentScroll } from '../components/onboarding/tutorialScroll'

export default function TutorialPage({ onFinish }: { onFinish: () => void }) {
  useLayoutEffect(() => {
    const bodyOverflow = document.body.style.overflow
    const rootOverflow = document.documentElement.style.overflow
    resetDocumentScroll()
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = bodyOverflow
      document.documentElement.style.overflow = rootOverflow
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
