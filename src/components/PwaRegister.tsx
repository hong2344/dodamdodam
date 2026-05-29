'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // PWA registration is non-critical; FCM setup can surface detailed errors later.
    });
  }, []);

  return null;
}
