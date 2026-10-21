'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { MenuItem } from '@/lib/menu';

export interface CartLine {
  item: MenuItem;
  quantity: number;
}

interface CartContextValue {
  lines: CartLine[];
  addItem: (item: MenuItem) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  total: number;
  itemCount: number;
  // False during SSR and the first client render, true once the cart has
  // been loaded from sessionStorage. The server has no access to that
  // storage, so anything that renders differently based on cart contents
  // must wait for this to avoid a hydration mismatch (see Nav.tsx).
  isHydrated: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'ep_demo_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Cart lives in sessionStorage: it's demo scratch state, not something
  // that needs to persist across browser restarts like the SDK's identity.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      // ignore malformed storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const addItem = (item: MenuItem) => {
    setLines((prev) => {
      const existing = prev.find((line) => line.item.id === item.id);
      if (existing) {
        return prev.map((line) => (line.item.id === item.id ? { ...line, quantity: line.quantity + 1 } : line));
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeItem = (id: string) => {
    setLines((prev) => prev.filter((line) => line.item.id !== id));
  };

  const clear = () => setLines([]);

  const total = lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <CartContext.Provider value={{ lines, addItem, removeItem, clear, total, itemCount, isHydrated: hydrated }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
