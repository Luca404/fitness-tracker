import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['app-icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'fitTrackr',
        short_name: 'fitTrackr',
        description: 'Diario personale per alimentazione, allenamenti e peso.',
        lang: 'it',
        id: '/',
        start_url: '/',
        theme_color: '#10b981',
        background_color: '#111827',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  test: { environment: 'jsdom' },
})
