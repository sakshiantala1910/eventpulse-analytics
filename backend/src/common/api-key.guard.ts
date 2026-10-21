import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'crypto';
import { API_KEY_TYPE, ApiKeyType } from './api-key.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const keyType = this.reflector.getAllAndOverride<ApiKeyType>(API_KEY_TYPE, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @RequireApiKey() on this route: leave it open.
    if (!keyType) {
      return true;
    }

    const configured = this.config.get<string>(
      keyType === 'ingest' ? 'EVENTPULSE_INGEST_API_KEY' : 'EVENTPULSE_DASHBOARD_API_KEY',
    );
    const request = context.switchToHttp().getRequest();
    // navigator.sendBeacon can't set custom headers, so the browser SDK's
    // unload-time flush passes the key as a query param instead. Only
    // relevant for the (write-only, non-secret-grade) ingest key.
    const provided = request.headers['x-api-key'] ?? request.query?.apiKey;

    if (!configured || !provided || !this.safeEqual(configured, provided)) {
      throw new UnauthorizedException('Invalid or missing API key.');
    }

    return true;
  }

  private safeEqual(a: string, b: string): boolean {
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    if (bufferA.length !== bufferB.length) {
      return false;
    }

    return timingSafeEqual(bufferA, bufferB);
  }
}
