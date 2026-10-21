import { EventPulseClient } from '../src/index';

function jsonResponse(body: unknown, status = 201): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('EventPulseClient', () => {
  it('sends the expected payload and returns true on success', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ id: 1 }));
    const client = new EventPulseClient({ baseUrl: 'http://backend.test', apiKey: 'test-key', fetchImpl: fetchImpl as any });

    const result = await client.track('order_created', { orderId: 42, total: 19.5 }, { anonymousId: 'anon-123' });

    expect(result).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://backend.test/api/v1/events');
    expect(init.headers['X-API-Key']).toBe('test-key');

    const body = JSON.parse(init.body);
    expect(body.eventName).toBe('order_created');
    expect(body.eventType).toBe('server');
    expect(body.source).toBe('server');
    expect(body.anonymousId).toBe('anon-123');
    expect(body.properties.orderId).toBe(42);
  });

  it('generates a synthetic anonymousId when identity is omitted', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ id: 1 }));
    const client = new EventPulseClient({ baseUrl: 'http://backend.test', apiKey: 'k', fetchImpl: fetchImpl as any });

    await client.track('cron_report_generated');

    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.anonymousId).toMatch(/^server-/);
  });

  it('retries on network failure then succeeds', async () => {
    const fetchImpl = jest
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(jsonResponse({ id: 2 }));

    const client = new EventPulseClient({ baseUrl: 'http://backend.test', apiKey: 'k', fetchImpl: fetchImpl as any, maxAttempts: 3 });

    const result = await client.track('order_created');

    expect(result).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('fails soft after exhausting retries on repeated network failure', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('network down'));
    const onError = jest.fn();

    const client = new EventPulseClient({ baseUrl: 'http://backend.test', apiKey: 'k', fetchImpl: fetchImpl as any, maxAttempts: 3, onError });

    const result = await client.track('order_created');

    expect(result).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(onError).toHaveBeenCalledTimes(3);
  });

  it('does not retry on a 4xx validation error', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ message: 'invalid' }, 422));

    const client = new EventPulseClient({ baseUrl: 'http://backend.test', apiKey: 'k', fetchImpl: fetchImpl as any, maxAttempts: 3 });

    const result = await client.track('order_created');

    expect(result).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('trackBatch returns the decoded API report', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ accepted: 2, rejected: [] }, 202));
    const client = new EventPulseClient({ baseUrl: 'http://backend.test', apiKey: 'k', fetchImpl: fetchImpl as any });

    const result = await client.trackBatch([
      { eventName: 'order_created', properties: { orderId: 1 } },
      { eventName: 'order_created', properties: { orderId: 2 } },
    ]);

    expect(result).toEqual({ accepted: 2, rejected: [] });
  });
});
