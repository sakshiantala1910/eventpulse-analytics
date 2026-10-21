import { SetMetadata } from '@nestjs/common';

export const API_KEY_TYPE = 'api_key_type';

export type ApiKeyType = 'ingest' | 'dashboard';

/**
 * Marks a route/controller as requiring the given EventPulse API key.
 * Two separate keys so a leaked dashboard (read) key can't write events,
 * and a leaked ingest (write) key can't read analytics data.
 */
export const RequireApiKey = (type: ApiKeyType) => SetMetadata(API_KEY_TYPE, type);
