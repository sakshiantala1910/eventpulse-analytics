'use client';

import { useCart } from '@/components/CartContext';
import { getEventPulse } from '@/lib/eventpulse';
import { MENU, type MenuItem } from '@/lib/menu';

const CATEGORIES = ['Starters', 'Mains', 'Desserts', 'Drinks'] as const;

export default function MenuPage() {
  const { addItem } = useCart();

  const handleAdd = (item: MenuItem) => {
    addItem(item);
    getEventPulse().track('add_to_cart', {
      itemId: item.id,
      itemName: item.name,
      price: item.price,
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold">Menu</h1>
      <p className="mt-2 text-neutral-600">Every &ldquo;Add to cart&rdquo; click fires a custom EventPulse event.</p>

      {CATEGORIES.map((category) => (
        <section key={category} className="mt-10">
          <h2 className="text-lg font-semibold uppercase tracking-wide text-neutral-500">{category}</h2>
          <ul className="mt-4 divide-y divide-neutral-200">
            {MENU.filter((item) => item.category === category).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-neutral-500">{item.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm text-neutral-700">${item.price.toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => handleAdd(item)}
                    className="rounded-full border border-black px-4 py-1.5 text-sm font-medium hover:bg-black hover:text-white"
                  >
                    Add
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
