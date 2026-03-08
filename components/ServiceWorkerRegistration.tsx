'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker once the page is hydrated.
 * Renders nothing — purely side-effect.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[SW] Registered, scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[SW] Registration failed:', err);
        });
    }
  }, []);

  return null;
}
