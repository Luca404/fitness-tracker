import { lazy, Suspense, useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { DataSnapshotProvider } from '../../contexts/DataContext'
import { TutorialEnvironmentProvider } from '../../contexts/TutorialEnvironment'
import { useSettings } from '../../contexts/SettingsContext'
import Layout from '../layout/Layout'
import PageLoading from '../common/PageLoading'
import { createTutorialStore } from './tutorialStore'
import { TUTORIAL_STEPS, type TutorialStep } from './tutorialSteps'
import TutorialSpotlight from './TutorialSpotlight'

const KitchenPage = lazy(() => import('../../pages/KitchenPage'))
const MealsPage = lazy(() => import('../../pages/MealsPage'))
const WeightPage = lazy(() => import('../../pages/WeightPage'))
const FitnessPage = lazy(() => import('../../pages/FitnessPage'))
const WellbeingPage = lazy(() => import('../../pages/WellbeingPage'))

function Screens({ step }: { step: TutorialStep }) {
  const location = useLocation()
  const navigate = useNavigate()
  const correctPage = `${location.pathname}${location.search}` === step.path
  useEffect(() => {
    if (!correctPage) navigate(step.path, { replace: true })
  }, [correctPage, navigate, step.path])
  if (!correctPage) return <PageLoading />
  return (
    <Routes key={step.id}>
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
  const [store] = useState(() => createTutorialStore(today))
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [progress, setProgress] = useState({ index: 0, baseline: 0 })
  const step = TUTORIAL_STEPS[progress.index]
  const goTo = useCallback((index: number) => {
    store.ensureScene(TUTORIAL_STEPS[index].scene)
    setProgress({ index, baseline: store.getSnapshot().revision })
  }, [store])
  const next = useCallback(() => {
    if (progress.index === TUTORIAL_STEPS.length - 1) onFinish()
    else goTo(progress.index + 1)
  }, [progress.index, goTo, onFinish])
  const back = useCallback(() => goTo(Math.max(0, progress.index - 1)), [goTo, progress.index])
  const chapter = useCallback((number: number) => goTo(TUTORIAL_STEPS.findIndex(item => item.chapter === number)), [goTo])

  useEffect(() => {
    let advanced = false
    return store.subscribe(() => {
      const current = store.getSnapshot()
      if (!advanced && step.waitFor && current.action === step.waitFor && current.revision > progress.baseline) {
        advanced = true
        queueMicrotask(next)
      }
    })
  }, [store, step.waitFor, progress.baseline, next])

  return (
    <TutorialEnvironmentProvider value={{ scene: step.scene, services: store.services, examples: store.examples() }}>
      <DataSnapshotProvider value={store.data()}>
        <div data-tutorial-demo data-revision={snapshot.revision}>
          <Suspense fallback={<PageLoading />}><Screens step={step} /></Suspense>
        </div>
        <TutorialSpotlight key={step.id} step={step} index={progress.index} total={TUTORIAL_STEPS.length}
          onNext={next} onBack={back} onChapter={chapter} onFinish={onFinish} />
      </DataSnapshotProvider>
    </TutorialEnvironmentProvider>
  )
}
