/**
 * esbuild entry that bundles the REAL app UI (not a mock) for the headless
 * screenshot check. Imports by relative path exactly like `main.tsx`, minus
 * the Vite-only CSS import — the harness page links the CSS itself so
 * esbuild does not need a CSS loader configured.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../../src/ui/App';
import { LazyBoundary } from '../../src/ui/lazy-boundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LazyBoundary>
      <App />
    </LazyBoundary>
  </React.StrictMode>,
);
