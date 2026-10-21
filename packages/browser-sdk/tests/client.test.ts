import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventPulse } from '../src/client';

function jsonResponse(ok: boolean, status = 202) {
  return { ok, status, json: async () => ({}) } as Response;
}

describe('EventPulse client', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('enqueues a custom event with identity and source fields', () => {
    const sdk = new EventPulse({ apiKey: 'k', apiHost: 'http://backend.test', autoTrackPageviews: false });

    sdk.track('add_to_cart', { item: 'Pizza' });

    // Force a flush so we can inspect what was sent instead of reaching into private state.
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(true));
    vi.stubGlobal('fetch', fetchMock);

    return sdk.flush().then(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('http://backend.test/api/v1/events/batch');
      expect(init.headers['X-API-Key']).toBe('k');

      const body = JSON.parse(init.body);
      expect(body.events).toHaveLength(1);
      expect(body.events[0]).toMatchObject({
        eventName: 'add_to_cart',
        eventType: 'custom',
        source: 'browser',
        properties: { item: 'Pizza' },
      });
      expect(body.events[0].anonymousId).toMatch(/.+/);
      sdk.destroy();
    });
  });

  it('tracks a pageview with the current location by default', () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(true));
    vi.stubGlobal('fetch', fetchMock);

    const sdk = new EventPulse({ apiKey: 'k', apiHost: 'http://backend.test', autoTrackPageviews: true });

    return sdk.flush().then(() => {
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.events[0].eventType).toBe('pageview');
      expect(body.events[0].url).toBe(window.location.pathname + window.location.search);
      sdk.destroy();
    });
  });

  it('clears the queue once the backend acknowledges the batch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(true));
    vi.stubGlobal('fetch', fetchMock);

    const sdk = new EventPulse({ apiKey: 'k', apiHost: 'http://backend.test', autoTrackPageviews: false });
    sdk.track('clicked_button');

    await sdk.flush();
    await sdk.flush();

    expect(fetchMock).toHaveBeenCalledTimes(1); // nothing left to send on the second flush
    sdk.destroy();
  });

  it('keeps events queued and reports the error when the request fails', async () => {
    const onError = vi.fn();
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);

    const sdk = new EventPulse({ apiKey: 'k', apiHost: 'http://backend.test', autoTrackPageviews: false, onError });
    sdk.track('clicked_button');

    await sdk.flush();

    expect(onError).toHaveBeenCalledWith(expect.stringContaining('offline'));

    // Retrying (e.g. next interval tick) should resend the same event.
    fetchMock.mockResolvedValue(jsonResponse(true));
    await sdk.flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    sdk.destroy();
  });

  it('auto-flushes once the queue reaches maxBatchSize', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(true));
    vi.stubGlobal('fetch', fetchMock);

    const sdk = new EventPulse({ apiKey: 'k', apiHost: 'http://backend.test', autoTrackPageviews: false, maxBatchSize: 2 });
    sdk.track('a');
    sdk.track('b'); // should trigger an automatic flush

    await Promise.resolve(); // let the fire-and-forget flush() microtask settle
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    sdk.destroy();
  });

  it('uses sendBeacon on unload and clears the queue only if it was accepted', () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { sendBeacon });

    const sdk = new EventPulse({ apiKey: 'k', apiHost: 'http://backend.test', autoTrackPageviews: false });
    sdk.track('page_hidden');

    sdk.flush(true);

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [url] = sendBeacon.mock.calls[0];
    expect(url).toContain('apiKey=k');
    sdk.destroy();
  });
});
