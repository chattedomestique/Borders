import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Deployed to GitHub Pages at user.github.io/Borders/, so the app lives at a
// sub-path. base is threaded into the manifest and Workbox navigateFallback
// below — the two spots the Playbook (§3.5) flags as most-often-wrong.
const base = '/Borders/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    // N1: the build owns the service worker. Workbox precaches the real
    // content-hashed assets (genuine offline), serves them cache-first (instant
    // repeat loads), and owns the cache version — no more hand-bumped
    // border-studio-vNN string that shipped a stale-shell regression.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png',
                      'maskable-192.png', 'maskable-512.png', '404.html'],
      manifest: {
        id: base,
        name: 'Border Studio',
        short_name: 'Borders',
        description: 'Frame your photos and videos with borders, color, grain, and text — save straight to your camera roll.',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        // §3.1: theme_color MUST equal the <meta name="theme-color"> light value.
        theme_color: '#F2EDE6',
        background_color: '#F2EDE6',
        categories: ['photo', 'graphics', 'utilities'],
        icons: [
          // §3.3: separate assets for `any` and `maskable` — never one for both.
          { src: `${base}icon-192.png`,     sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: `${base}icon-512.png`,     sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: `${base}maskable-192.png`, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: `${base}maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The actual built assets, including the self-hosted OFL fonts so the
        // app's typography is correct offline (§3.6).
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,otf,ttf}'],
        navigateFallback: `${base}index.html`,   // base-aware — the one everyone gets wrong
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
})
