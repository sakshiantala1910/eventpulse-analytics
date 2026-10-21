'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/components/CartContext';
import { getEventPulse } from '@/lib/eventpulse';
import { requireEnv } from '@/lib/env';

const API_HOST = requireEnv('NEXT_PUBLIC_EVENTPULSE_API_HOST', process.env.NEXT_PUBLIC_EVENTPULSE_API_HOST);

export default function CheckoutPage() {
  const { lines, total, removeItem, clear, isHydrated } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrderId, setConfirmedOrderId] = useState<number | null>(null);

  useEffect(() => {
    if (lines.length > 0) {
      getEventPulse().track('checkout_viewed', { itemCount: lines.length, total });
    }
    // Only want this once per mount, not on every cart edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const identity = getEventPulse().getIdentity();

    try {
      const response = await fetch(`${API_HOST}/api/v1/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName || undefined,
          items: lines.map((line) => ({ name: line.item.name, price: line.item.price, quantity: line.quantity })),
          anonymousId: identity.anonymousId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Order failed with status ${response.status}`);
      }

      const data = await response.json();

      // The backend already fires `order_created` as a server-side event via
      // the Node server SDK. This browser-side event is a *different* signal
      // (confirms the client actually rendered + reached the success state)
      // — both show up in the dashboard, demonstrating browser + server
      // tracking of the same business moment from two vantage points.
      getEventPulse().track('order_completed', { orderId: data.id, total: data.total });

      setConfirmedOrderId(data.id);
      clear();
    } catch {
      setError('Something went wrong placing your order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmedOrderId !== null) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="text-2xl font-bold">Order #{confirmedOrderId} confirmed 🎉</h1>
        <p className="mt-2 text-neutral-600">Check the dashboard — this order just landed as an `order_created` event.</p>
        <Link href="/dashboard" className="mt-6 inline-block rounded-full bg-black px-6 py-3 text-sm font-semibold text-white">
          Open dashboard
        </Link>
      </div>
    );
  }

  // The server always renders an empty cart (sessionStorage isn't available
  // server-side). Showing this same "empty" branch until the client has
  // loaded the real cart keeps the first client render identical to what
  // the server sent, avoiding a hydration mismatch.
  if (!isHydrated || lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Link href="/menu" className="mt-6 inline-block rounded-full bg-black px-6 py-3 text-sm font-semibold text-white">
          Browse the menu
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-3xl font-bold">Checkout</h1>

      <ul className="mt-6 divide-y divide-neutral-200">
        {lines.map((line) => (
          <li key={line.item.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">
                {line.item.name} × {line.quantity}
              </p>
              <p className="text-sm text-neutral-500">${(line.item.price * line.quantity).toFixed(2)}</p>
            </div>
            <button type="button" onClick={() => removeItem(line.item.id)} className="text-sm text-neutral-500 underline">
              Remove
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-4 flex justify-between text-lg font-semibold">
        <span>Total</span>
        <span>${total.toFixed(2)}</span>
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block text-sm font-medium">
          Name (optional)
          <input
            type="text"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Jane Doe"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-black px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Placing order…' : 'Place order'}
        </button>
      </form>
    </div>
  );
}
