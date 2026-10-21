/** Fails loudly instead of silently falling back to a hardcoded default. */
export function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required env var ${name}. Check your .env.local file.`);
  }
  return value;
}
