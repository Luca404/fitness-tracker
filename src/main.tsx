import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { SettingsProvider } from './contexts/SettingsContext'
import AppErrorBoundary from './components/common/AppErrorBoundary'
import PwaUpdateNotice from './components/common/PwaUpdateNotice'
import { installChunkRecovery } from './utils/chunkRecovery'

installChunkRecovery(import.meta.env.VITE_APP_BUILD_ID)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AuthProvider>
        <SettingsProvider>
          <DataProvider>
            <App />
            <PwaUpdateNotice />
          </DataProvider>
        </SettingsProvider>
      </AuthProvider>
    </AppErrorBoundary>
  </React.StrictMode>
)
