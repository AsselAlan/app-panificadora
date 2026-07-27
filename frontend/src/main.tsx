import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from "@sentry/react"
import './index.css'
import App from './App.tsx'
import { useStore } from './store/useStore'

// @ts-ignore
window.useStore = useStore;

Sentry.init({
  dsn: "https://755a944d5eea3dc6da1ea9591a12e648@o4511690226401280.ingest.us.sentry.io/4511690235838464",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0, 
  replaysSessionSampleRate: 0.1, 
  replaysOnErrorSampleRate: 1.0,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
