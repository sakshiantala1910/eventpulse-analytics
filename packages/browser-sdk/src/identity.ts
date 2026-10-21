const ANONYMOUS_ID_KEY = 'ep_anonymous_id';
const USER_ID_KEY = 'ep_user_id';

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
 *  - userId: optional, set via identify(). Persisted in localStorage so
 *    once a visitor is known, subsequent pageviews stay attributed to them
 *    without calling identify() again (documented assumption — this demo
 *    doesn't implement anonymous->user alias merging on the backend).
 */
export class IdentityManager {
  constructor(private readonly storage: Storage | null) {}

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
}
