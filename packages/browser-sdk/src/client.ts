import { IdentityManager } from './identity';
import { PersistentQueue } from './queue';

export interface EventPulseOptions {
  apiKey: string;
  apiHost: string;
  /** How often the queue is flushed to the backend. Default: 5000ms. */
  flushIntervalMs?: number;
  /** Flush immediately once this many events are queued. Default: 20. */
  maxBatchSize?: number;
  /** Track a pageview for the current location as soon as the SDK loads. Default: true. */
  autoTrackPageviews?: boolean;
  onError?: (message: string) => void;
}

interface QueuedEvent {
  eventName: string;
  eventType: 'pageview' | 'custom';
  source: 'browser';
  anonymousId: string;
  sessionId: string | null;
  userId: string | null;
  url?: string;
  referrer?: string;
  properties?: Record<string, unknown>;
  occurredAt: string;
}

const isBrowser = typeof window !== 'undefined';

export class EventPulse {
  private readonly identity: IdentityManager;
  private readonly queue: PersistentQueue<QueuedEvent>;
  private readonly options: Required<Omit<EventPulseOptions, 'onError'>> & Pick<EventPulseOptions, 'onError'>;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: EventPulseOptions) {
    this.options = {
      flushIntervalMs: 5000,
      maxBatchSize: 20,
      autoTrackPageviews: true,
      ...options,
    };

    this.identity = new IdentityManager(
      isBrowser ? window.localStorage : null,
      isBrowser ? window.sessionStorage : null,
    );
    this.queue = new PersistentQueue<QueuedEvent>(isBrowser ? window.localStorage : null);

    if (!isBrowser) return;

    this.flushTimer = setInterval(() => void this.flush(), this.options.flushIntervalMs);

    // Best-effort delivery on tab close/navigation: sendBeacon doesn't
    // support custom headers, so the API key travels as a query param here
    // (acceptable since the ingest key is a write-only, rate-limited key,
    // not a secret — see README security notes).
    window.addEventListener('pagehide', () => this.flush(true));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush(true);
    });

    if (this.options.autoTrackPageviews) {
      this.page();
    }
  }

  identify(userId: string): void {
    this.identity.identify(userId);
  }

  /**
   * Current visitor identity. Useful for attributing a server-side event
   * (e.g. an order placed via a REST call) back to this browser session —
   * pass these along in the request body/headers to your backend.
   */
  getIdentity(): { anonymousId: string; sessionId: string | null; userId: string | null } {
    return {
      anonymousId: this.identity.getAnonymousId(),
      sessionId: this.identity.touchSession(),
      userId: this.identity.getUserId(),
    };
  }

  /** Track a page view. Defaults to the current location; pass a path for SPA route changes. */
  page(path?: string, properties: Record<string, unknown> = {}): void {
    const url = path ?? (isBrowser ? window.location.pathname + window.location.search : '');
    this.enqueue('page_view', 'pageview', { ...properties }, url);
  }

  /** Track a custom event, e.g. "add_to_cart". */
  track(eventName: string, properties: Record<string, unknown> = {}): void {
    this.enqueue(eventName, 'custom', properties);
  }

  async flush(useBeacon = false): Promise<void> {
    if (!isBrowser || this.queue.length === 0) return;

    const batch = this.queue.peek(this.options.maxBatchSize);

    if (useBeacon) {
      this.flushWithBeacon(batch);
      return;
    }

    try {
      const response = await fetch(`${this.options.apiHost}/api/v1/events/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.options.apiKey,
        },
        body: JSON.stringify({ events: batch }),
        keepalive: true,
      });

      if (response.ok) {
        this.queue.removeFront(batch.length);
      } else {
        this.options.onError?.(`EventPulse flush failed with status ${response.status}`);
      }
    } catch (error) {
      // Left in the queue; the next interval tick retries automatically.
      this.options.onError?.(`EventPulse flush failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  destroy(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
  }

  private flushWithBeacon(batch: QueuedEvent[]): void {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) return;

    const url = `${this.options.apiHost}/api/v1/events/batch?apiKey=${encodeURIComponent(this.options.apiKey)}`;
    const blob = new Blob([JSON.stringify({ events: batch })], { type: 'application/json' });
    const sent = navigator.sendBeacon(url, blob);

    if (sent) {
      this.queue.removeFront(batch.length);
    }
  }

  private enqueue(
    eventName: string,
    eventType: 'pageview' | 'custom',
    properties: Record<string, unknown>,
    url?: string,
  ): void {
    if (!isBrowser) return;

    const event: QueuedEvent = {
      eventName,
      eventType,
      source: 'browser',
      anonymousId: this.identity.getAnonymousId(),
      sessionId: this.identity.touchSession(),
      userId: this.identity.getUserId(),
      url,
      referrer: document.referrer || undefined,
      properties,
      occurredAt: new Date().toISOString(),
    };

    this.queue.push(event);

    if (this.queue.length >= this.options.maxBatchSize) {
      void this.flush();
    }
  }
}
