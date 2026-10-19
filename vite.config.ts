import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['plan-la-apple-touch.png', 'offline.html'],
      manifest: {
        name: 'PLAN Lolo & alexia',
        short_name: 'Lolo & alexia',
        description: 'Tu guía de entrenamiento, ideas para comer y progreso privado.',
        theme_color: '#F6F3EC',
        background_color: '#F6F3EC',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: './',
        start_url: './',
        lang: 'es',
        categories: ['fitness', 'health', 'lifestyle'],
        icons: [
          { src: 'plan-la-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'plan-la-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'plan-la-icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,webp,svg,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: { cacheName: 'pages', networkTimeoutSeconds: 3 }
          },
          {
            urlPattern: ({ request }) => ['style', 'script', 'worker'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'assets' }
          }
        ]
      }
    })
  ],
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          charts: ['recharts'],
          icons: ['lucide-react'],
          storage: ['idb'],
        },
      },
    },
  },
})
