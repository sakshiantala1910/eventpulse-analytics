'use client';

import Link from 'next/link';
import { getEventPulse } from '@/lib/eventpulse';

export default function Home() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-20 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Trattoria Pulse</h1>
      <p className="mx-auto mt-4 max-w-xl text-neutral-600">
        Fresh, handmade Italian food in the heart of town. Browse the menu, build your order, and see every click
        show up live in our{' '}
        <Link href="/dashboard" className="underline">
          analytics dashboard
        </Link>
        .
      </p>
      <Link
        href="/menu"
        onClick={() => getEventPulse().track('cta_clicked', { cta: 'view_menu_hero' })}
        className="mt-8 inline-block rounded-full bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
      >
        View the menu
      </Link>
    </div>
  );
}
