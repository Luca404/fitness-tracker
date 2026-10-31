import { useNavigate, useSearchParams } from 'react-router-dom'
import QuickTutorial from '../components/onboarding/QuickTutorial'
import { useData } from '../contexts/DataContext'

export default function TutorialPage() {
  const { dismissTutorial } = useData()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  function finish() {
    void dismissTutorial()
    navigate(searchParams.get('from') === 'settings' ? '/settings' : '/meals', { replace: true })
  }

  return <QuickTutorial onFinish={finish} />
}
