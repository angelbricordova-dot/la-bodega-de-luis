import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const BUILD = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || 'local'

export default defineConfig({
  base: '/',
  define: { __BUILD__: JSON.stringify(BUILD) },
  build: { chunkSizeWarningLimit: 700 },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'TuBodega',
        short_name: 'TuBodega',
        description: 'Ventas, inventario y fiados de tu bodega en el teléfono',
        theme_color: '#2f9e6e',
        background_color: '#f6f8f7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'es-VE',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] },
    }),
  ],
})
