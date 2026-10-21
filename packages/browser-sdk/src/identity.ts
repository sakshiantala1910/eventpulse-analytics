const ANONYMOUS_ID_KEY = 'ep_anonymous_id';
const USER_ID_KEY = 'ep_user_id';
const SESSION_KEY = 'ep_session';

/** A session resets after this long with no tracked activity. */
export const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

interface StoredSession {
  id: string;
  lastActivity: number;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers without crypto.randomUUID.
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Identity model for this SDK:
 *  - anonymousId: generated once per browser, persisted in localStorage.
 *    Survives tabs/sessions; this is the primary join key for "unique visitors".
 *  - sessionId: persisted in sessionStorage with a rolling idle timeout.
 *    Resets on new tab or after 30 minutes of inactivity.
 *  - userId: optional, set via identify(). Persisted in localStorage so
 *    once a visitor is known, subsequent pageviews stay attributed to them
 *    without calling identify() again (documented assumption — this demo
 *    doesn't implement anonymous->user alias merging on the backend).
 */
export class IdentityManager {
  constructor(private readonly storage: Storage | null, private readonly sessionStorage: Storage | null) {}

  getAnonymousId(): string {
    if (!this.storage) return generateId();

    let id = this.storage.getItem(ANONYMOUS_ID_KEY);
    if (!id) {
      id = generateId();
      this.storage.setItem(ANONYMOUS_ID_KEY, id);
    }
    return id;
  }

  getUserId(): string | null {
    return this.storage?.getItem(USER_ID_KEY) ?? null;
  }

  identify(userId: string): void {
    this.storage?.setItem(USER_ID_KEY, userId);
  }

  /** Call on every tracked event: returns the current session id and bumps its idle timer. */
  touchSession(): string | null {
    if (!this.sessionStorage) return null;

    const now = Date.now();
    const raw = this.sessionStorage.getItem(SESSION_KEY);
    let session: StoredSession | null = raw ? safeParse(raw) : null;

    if (!session || now - session.lastActivity > SESSION_IDLE_TIMEOUT_MS) {
      session = { id: generateId(), lastActivity: now };
    } else {
      session.lastActivity = now;
    }

    this.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session.id;
  }
}

function safeParse(raw: string): StoredSession | null {
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}
