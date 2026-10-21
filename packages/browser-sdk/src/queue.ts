const QUEUE_KEY = 'ep_queue';

/**
 * In-memory queue backed by localStorage so a reload/crash between "track()"
 * and the next flush doesn't silently drop events. Events are only removed
 * once the backend has acknowledged them.
 */
export class PersistentQueue<T> {
  private items: T[];

  constructor(private readonly storage: Storage | null, private readonly maxStoredItems = 500) {
    this.items = this.load();
  }

  push(item: T): void {
    this.items.push(item);
    if (this.items.length > this.maxStoredItems) {
      // Drop oldest first: a stuck queue shouldn't grow unbounded.
      this.items.splice(0, this.items.length - this.maxStoredItems);
    }
    this.persist();
  }

  peek(count: number): T[] {
    return this.items.slice(0, count);
  }

  removeFront(count: number): void {
    this.items.splice(0, count);
    this.persist();
  }

  get length(): number {
    return this.items.length;
  }

  private load(): T[] {
    if (!this.storage) return [];
    try {
      const raw = this.storage.getItem(QUEUE_KEY);
      return raw ? (JSON.parse(raw) as T[]) : [];
    } catch {
      return [];
    }
  }

  private persist(): void {
    this.storage?.setItem(QUEUE_KEY, JSON.stringify(this.items));
  }
}
