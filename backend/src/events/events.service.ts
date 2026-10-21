import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { CreateEventDto } from './dto/create-event.dto';
import { Event } from './event.entity';

export interface IngestContext {
  ip?: string;
  userAgent?: string;
}

export interface IngestResult {
  event: Event | null;
  errors: Record<string, string[]> | null;
}

export interface BatchIngestResult {
  accepted: number;
  rejected: { index: number; errors: Record<string, string[]> }[];
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event) private readonly eventsRepository: Repository<Event>,
    private readonly config: ConfigService,
  ) {}

  async ingestOne(payload: Record<string, unknown>, context: IngestContext): Promise<IngestResult> {
    const dto = plainToInstance(CreateEventDto, payload);
    const violations = await validate(dto, { whitelist: true });

    if (violations.length > 0) {
      const errors: Record<string, string[]> = {};
      for (const violation of violations) {
        errors[violation.property] = Object.values(violation.constraints ?? {});
      }

      return { event: null, errors };
    }

    const event = this.eventsRepository.create({
      eventName: dto.eventName,
      eventType: dto.eventType,
      source: dto.source,
      anonymousId: dto.anonymousId,
      sessionId: dto.sessionId ?? null,
      userId: dto.userId ?? null,
      url: dto.url ?? null,
      referrer: dto.referrer ?? null,
      userAgent: context.userAgent ? context.userAgent.slice(0, 512) : null,
      ipHash: this.hashIp(context.ip),
      properties: dto.properties ?? null,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      receivedAt: new Date(),
    });

    await this.eventsRepository.save(event);

    return { event, errors: null };
  }

  /**
   * Each item in a batch is validated and persisted independently: one bad
   * event doesn't reject the whole flush from the browser SDK's queue.
   */
  async ingestBatch(events: Record<string, unknown>[], context: IngestContext): Promise<BatchIngestResult> {
    const maxBatchSize = this.config.get<number>('EVENTPULSE_MAX_BATCH_SIZE', 50);
    const limited = events.slice(0, maxBatchSize);

    let accepted = 0;
    const rejected: { index: number; errors: Record<string, string[]> }[] = [];

    for (let index = 0; index < limited.length; index++) {
      const item = limited[index];

      if (typeof item !== 'object' || item === null) {
        rejected.push({ index, errors: { _: ['Event must be an object.'] } });
        continue;
      }

      const result = await this.ingestOne(item, context);

      if (result.event) {
        accepted++;
      } else {
        rejected.push({ index, errors: result.errors! });
      }
    }

    return { accepted, rejected };
  }

  /** Never store raw IPs; a salted hash still supports approximate unique counts. */
  private hashIp(ip?: string): string | null {
    if (!ip) {
      return null;
    }

    const salt = this.config.get<string>('EVENTPULSE_INGEST_API_KEY', 'eventpulse');

    return createHash('sha256').update(ip + salt).digest('hex');
  }
}
