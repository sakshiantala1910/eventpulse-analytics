'use client';

import Link from 'next/link';
import { useCart } from './CartContext';

export function Nav() {
  const { itemCount, isHydrated } = useCart();

  return (
    <header className="border-b border-black/10 bg-white">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          🍝 Trattoria Pulse
        </Link>
        <div className="flex items-center gap-6 text-sm font-medium text-neutral-700">
          <Link href="/menu" className="hover:text-black">
            Menu
          </Link>
          <Link href="/checkout" className="hover:text-black">
            {/* isHydrated gates this: the server always renders an empty cart
                (it has no access to sessionStorage), so showing the badge
                before the client has loaded the real cart would mismatch
                whatever the server actually sent. */}
            Checkout {isHydrated && itemCount > 0 && <span className="ml-1 rounded-full bg-black px-2 py-0.5 text-xs text-white">{itemCount}</span>}
          </Link>
          <Link href="/dashboard" className="hover:text-black">
            Dashboard
          </Link>
        </div>
      </nav>
    </header>
  );
}
