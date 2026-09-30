import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { initErrorTracking, reportError } from './services/errorTracking.js'

// Before anything renders, so a failure during the very first render is still
// reported. A no-op unless VITE_SENTRY_DSN is set, so development and CI send
// nothing anywhere and need no account.
initErrorTracking();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* The outermost boundary: nothing in the app can blank the page. A crash
        inside a page boundary is recoverable without a reload; this one is the
        backstop, and offers the reload instead. */}
    <ErrorBoundary
      variant="app"
      label="the app"
      onError={(error, info) => reportError(error, { componentStack: info.componentStack })}
    >
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
