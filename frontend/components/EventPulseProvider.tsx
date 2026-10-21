'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { getEventPulse } from '@/lib/eventpulse';

function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    getEventPulse().page(query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

  return null;
}

/** Mounted once in the root layout; fires a pageview on every route change. */
export function EventPulseProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageviewTracker />
      {children}
    </>
  );
}
