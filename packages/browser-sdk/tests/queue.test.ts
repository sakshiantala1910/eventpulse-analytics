import { afterEach, describe, expect, it } from 'vitest';
import { PersistentQueue } from '../src/queue';

describe('PersistentQueue', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('persists pushed items and reloads them in a new instance', () => {
    const queue1 = new PersistentQueue<number>(window.localStorage);
    queue1.push(1);
    queue1.push(2);

    const queue2 = new PersistentQueue<number>(window.localStorage);
    expect(queue2.length).toBe(2);
    expect(queue2.peek(2)).toEqual([1, 2]);
  });

  it('removes items from the front and persists the change', () => {
    const queue = new PersistentQueue<number>(window.localStorage);
    queue.push(1);
    queue.push(2);
    queue.push(3);

    queue.removeFront(2);

    expect(queue.peek(10)).toEqual([3]);

    const reloaded = new PersistentQueue<number>(window.localStorage);
    expect(reloaded.peek(10)).toEqual([3]);
  });

  it('drops the oldest items once the stored cap is exceeded', () => {
    const queue = new PersistentQueue<number>(window.localStorage, 3);
    queue.push(1);
    queue.push(2);
    queue.push(3);
    queue.push(4);

    expect(queue.peek(10)).toEqual([2, 3, 4]);
  });

  it('works purely in-memory when storage is unavailable', () => {
    const queue = new PersistentQueue<number>(null);
    queue.push(1);
    expect(queue.length).toBe(1);
  });
});
