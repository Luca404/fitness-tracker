import { useEffect } from 'react'
import { MemoryRouter } from 'react-router-dom'
import QuickTutorial from '../components/onboarding/QuickTutorial'
import { SettingsProvider } from '../contexts/SettingsContext'

export default function TutorialPage({ onFinish }: { onFinish: () => void }) {
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
