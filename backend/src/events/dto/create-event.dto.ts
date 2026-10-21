import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { EventSource, EventType } from '../event.entity';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  eventName: string;

  @IsIn(['pageview', 'custom', 'server'])
  eventType: EventType;

  @IsIn(['browser', 'server'])
  source: EventSource;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  anonymousId: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;

  // Required for pageview events, optional otherwise.
  @ValidateIf((o) => o.eventType === 'pageview')
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  referrer?: string;

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
