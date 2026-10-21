import { afterEach, describe, expect, it, vi } from 'vitest';
import { IdentityManager, SESSION_IDLE_TIMEOUT_MS } from '../src/identity';

describe('IdentityManager', () => {
  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('generates and persists an anonymous id across instances', () => {
    const manager1 = new IdentityManager(window.localStorage, window.sessionStorage);
    const id1 = manager1.getAnonymousId();

    const manager2 = new IdentityManager(window.localStorage, window.sessionStorage);
    const id2 = manager2.getAnonymousId();

    expect(id1).toBe(id2);
    expect(id1).toMatch(/.+/);
  });

  it('returns null userId until identify() is called, then persists it', () => {
    const manager = new IdentityManager(window.localStorage, window.sessionStorage);
    expect(manager.getUserId()).toBeNull();

    manager.identify('user-42');
    expect(manager.getUserId()).toBe('user-42');

    const another = new IdentityManager(window.localStorage, window.sessionStorage);
    expect(another.getUserId()).toBe('user-42');
  });

  it('keeps the same session id within the idle timeout', () => {
    const manager = new IdentityManager(window.localStorage, window.sessionStorage);

    const first = manager.touchSession();
    const second = manager.touchSession();

    expect(first).toBe(second);
  });

  it('issues a new session id after the idle timeout elapses', () => {
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1_000_000);

    const manager = new IdentityManager(window.localStorage, window.sessionStorage);
    const first = manager.touchSession();

    nowSpy.mockReturnValue(1_000_000 + SESSION_IDLE_TIMEOUT_MS + 1);
    const second = manager.touchSession();

    expect(second).not.toBe(first);
    nowSpy.mockRestore();
  });

  it('falls back to an in-memory id when storage is unavailable', () => {
    const manager = new IdentityManager(null, null);
    expect(manager.getAnonymousId()).toMatch(/.+/);
    expect(manager.touchSession()).toBeNull();
  });
});
