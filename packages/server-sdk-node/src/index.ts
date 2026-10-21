export interface EventIdentity {
  anonymousId?: string;
  sessionId?: string;
  userId?: string;
}

export interface EventPulseClientOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
  maxAttempts?: number;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  onError?: (error: { attempt: number; path: string; message: string }) => void;
}

export interface BatchEventInput {
  eventName: string;
  properties?: Record<string, unknown>;
  identity?: EventIdentity;
  occurredAt?: Date;
}

interface BatchApiReport {
  accepted: number;
  rejected: { index: number; errors: Record<string, string[]> }[];
}

/**
 * Minimal server-side client for sending business events to EventPulse.
 *
 * Design goals:
 *  - Never let analytics break the caller's real business flow. All methods
 *    fail soft: on error they report via onError() and return false/null
 *    instead of throwing, so a flaky analytics endpoint can't fail a checkout.
 *  - Short timeout + a couple of retries with backoff, because this is
 *    typically called inline during a request (not a background job).
 */
export class EventPulseClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly fetchImpl: typeof fetch;
  private readonly onError?: EventPulseClientOptions['onError'];

  constructor(options: EventPulseClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 2000;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.onError = options.onError;
  }

  /**
   * Track a single server-side business event, e.g. "order_created".
   *
   * identity.anonymousId should be forwarded from the originating browser
   * session when known, so the event joins the visitor's journey. When
   * omitted, a synthetic per-call id is generated (documented limitation:
   * such events won't be attributed to a real visitor).
   */
  async track(eventName: string, properties: Record<string, unknown> = {}, identity: EventIdentity = {}, occurredAt?: Date): Promise<boolean> {
    const payload = this.buildPayload(eventName, properties, identity, occurredAt);
    const response = await this.sendWithRetry('/api/v1/events', payload);
    return response !== null;
  }

  /**
   * Track several events in one HTTP call. Returns the API's per-item
   * accept/reject report, or null if the whole request failed after retries.
   */
  async trackBatch(events: BatchEventInput[]): Promise<BatchApiReport | null> {
    const payload = {
      events: events.map((event) => this.buildPayload(event.eventName, event.properties ?? {}, event.identity ?? {}, event.occurredAt)),
    };

    const response = await this.sendWithRetry('/api/v1/events/batch', payload);
    if (response === null) {
      return null;
    }

    return (await response.json()) as BatchApiReport;
  }

  private buildPayload(eventName: string, properties: Record<string, unknown>, identity: EventIdentity, occurredAt?: Date) {
    return {
      eventName,
      eventType: 'server',
      source: 'server',
      anonymousId: identity.anonymousId ?? `server-${randomId()}`,
      sessionId: identity.sessionId ?? null,
      userId: identity.userId ?? null,
      properties,
      occurredAt: (occurredAt ?? new Date()).toISOString(),
    };
  }

  private async sendWithRetry(path: string, payload: unknown): Promise<Response | null> {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-API-Key': this.apiKey,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          // 4xx means the payload itself is invalid (e.g. failed validation);
          // retrying won't change that, so fail fast instead of wasting attempts.
          if (response.status >= 400 && response.status < 500) {
            this.onError?.({ attempt, path, message: `EventPulse API rejected payload with ${response.status}` });
            return null;
          }

          throw new Error(`EventPulse API responded with ${response.status}`);
        }

        return response;
      } catch (error) {
        this.onError?.({
          attempt,
          path,
          message: error instanceof Error ? error.message : String(error),
        });

        if (attempt >= this.maxAttempts) {
          return null;
        }

        await sleep(100 * 2 ** (attempt - 1)); // 100ms, 200ms, 400ms...
      } finally {
        clearTimeout(timer);
      }
    }

    return null;
  }
}

function randomId(): string {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
