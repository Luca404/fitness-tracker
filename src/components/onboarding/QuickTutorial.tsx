import { lazy, Suspense, useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { DataSnapshotProvider } from '../../contexts/DataContext'
import { TutorialEnvironmentProvider } from '../../contexts/TutorialEnvironment'
import { useSettings } from '../../contexts/SettingsContext'
import Layout from '../layout/Layout'
import PageLoading from '../common/PageLoading'
import { createTutorialStore } from './tutorialStore'
import { TUTORIAL_STEPS } from './tutorialSteps'
import TutorialSpotlight from './TutorialSpotlight'

const KitchenPage = lazy(() => import('../../pages/KitchenPage'))
const MealsPage = lazy(() => import('../../pages/MealsPage'))
const WeightPage = lazy(() => import('../../pages/WeightPage'))
const FitnessPage = lazy(() => import('../../pages/FitnessPage'))
const WellbeingPage = lazy(() => import('../../pages/WellbeingPage'))

function Screens() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/kitchen" element={<KitchenPage />} />
        <Route path="/meals" element={<MealsPage />} />
        <Route path="/weight" element={<WeightPage />} />
        <Route path="/fitness" element={<FitnessPage />} />
        <Route path="/meals/wellbeing" element={<WellbeingPage />} />
      </Route>
    </Routes>
  )
}

export default function QuickTutorial({ onFinish }: { onFinish: () => void }) {
  const { today } = useSettings()
  const navigate = useNavigate()
  const [store] = useState(() => createTutorialStore(today))
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [progress, setProgress] = useState({ index: 0, baseline: 0, visit: 0, completed: false })
  const step = TUTORIAL_STEPS[progress.index]
  const goTo = useCallback((index: number, restore = false) => {
    if (TUTORIAL_STEPS[index].chapter === 2) store.ensureScene('meal-hub')
    store.ensureScene(TUTORIAL_STEPS[index].scene)
    if (restore) navigate(TUTORIAL_STEPS[index].path, { replace: true })
    setProgress(previous => ({ index, baseline: store.getSnapshot().revision,
      visit: previous.visit + (restore ? 1 : 0), completed: false }))
  }, [store, navigate])
  const next = useCallback(() => {
    if (progress.index === TUTORIAL_STEPS.length - 1) onFinish()
    else goTo(progress.index + 1)
  }, [progress.index, goTo, onFinish])
  const back = useCallback(() => goTo(Math.max(0, progress.index - 1), true), [goTo, progress.index])
  const chapter = useCallback((number: number) => goTo(TUTORIAL_STEPS.findIndex(item => item.chapter === number), true), [goTo])

  useEffect(() => {
    return store.subscribe(() => {
      const current = store.getSnapshot()
      if (step.waitFor && current.action === step.waitFor && current.revision > progress.baseline) {
        setProgress(previous => previous.completed ? previous : { ...previous, completed: true })
      }
    })
  }, [store, step.waitFor, progress.baseline])

  return (
    <TutorialEnvironmentProvider value={{ scene: step.scene, services: store.services, examples: store.examples() }}>
      <DataSnapshotProvider value={store.data()}>
        <div data-tutorial-demo data-revision={snapshot.revision}>
          <Suspense fallback={<PageLoading />}><Screens key={progress.visit} /></Suspense>
        </div>
        <TutorialSpotlight step={step} completed={progress.completed} index={progress.index} total={TUTORIAL_STEPS.length}
          onRecover={() => progress.index === TUTORIAL_STEPS.length - 1 ? onFinish() : goTo(progress.index + 1, true)}
          onNext={next} onBack={back} onChapter={chapter} onFinish={onFinish} />
      </DataSnapshotProvider>
    </TutorialEnvironmentProvider>
  )
}
