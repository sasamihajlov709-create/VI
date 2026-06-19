import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { logger } from './lib/logger';
import './index.css';

// Initialize the global logger instance
logger.init();

// Register service worker for PWA offline features
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => logger.info('Service worker registered successfully', { scope: reg.scope }))
      .catch((err) => logger.warn('Service worker registration failed', { error: err.message }));
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
