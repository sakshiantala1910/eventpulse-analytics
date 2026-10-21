'use client';

import { EventPulse } from '@eventpulse/browser-sdk';
import { requireEnv } from './env';

let instance: EventPulse | null = null;

/**
 * Single SDK instance for the whole app. We track pageviews manually (see
 * components/EventPulseProvider.tsx) rather than via autoTrackPageviews,
 * because Next.js client-side route transitions don't reload the page —
 * the SDK's constructor-time auto-track would only ever fire once.
 */
export function getEventPulse(): EventPulse {
  if (!instance) {
    instance = new EventPulse({
      apiKey: requireEnv('NEXT_PUBLIC_EVENTPULSE_INGEST_API_KEY', process.env.NEXT_PUBLIC_EVENTPULSE_INGEST_API_KEY),
      apiHost: requireEnv('NEXT_PUBLIC_EVENTPULSE_API_HOST', process.env.NEXT_PUBLIC_EVENTPULSE_API_HOST),
      autoTrackPageviews: false,
      onError: (message) => {
        console.warn('[EventPulse]', message);
      },
    });
  }

  return instance;
}
