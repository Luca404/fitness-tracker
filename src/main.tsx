import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { SettingsProvider } from './contexts/SettingsContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <SettingsProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </SettingsProvider>
    </AuthProvider>
  </React.StrictMode>
)
