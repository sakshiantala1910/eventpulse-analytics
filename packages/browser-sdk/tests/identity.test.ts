import { afterEach, describe, expect, it } from 'vitest';
import { IdentityManager } from '../src/identity';

describe('IdentityManager', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('generates and persists an anonymous id across instances', () => {
    const manager1 = new IdentityManager(window.localStorage);
    const id1 = manager1.getAnonymousId();

    const manager2 = new IdentityManager(window.localStorage);
    const id2 = manager2.getAnonymousId();

    expect(id1).toBe(id2);
    expect(id1).toMatch(/.+/);
  });

  it('returns null userId until identify() is called, then persists it', () => {
    const manager = new IdentityManager(window.localStorage);
    expect(manager.getUserId()).toBeNull();

    manager.identify('user-42');
    expect(manager.getUserId()).toBe('user-42');

    const another = new IdentityManager(window.localStorage);
    expect(another.getUserId()).toBe('user-42');
  });

  it('falls back to an in-memory id when storage is unavailable', () => {
    const manager = new IdentityManager(null);
    expect(manager.getAnonymousId()).toMatch(/.+/);
  });
});
