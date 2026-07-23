import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import './fonts.css'
import App from './App.jsx'

// N1: the build owns the service worker (vite-plugin-pwa / Workbox). autoUpdate
// + immediate means an installed client silently picks up the new version — no
// update-prompt UI, no hand-maintained cache version.
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
