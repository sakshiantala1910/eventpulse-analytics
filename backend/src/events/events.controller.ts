import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyGuard } from '../common/api-key.guard';
import { RequireApiKey } from '../common/api-key.decorator';
import { CreateEventBatchDto } from './dto/create-event-batch.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsService } from './events.service';

@Controller('v1/events')
@UseGuards(ApiKeyGuard)
@RequireApiKey('ingest')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(201)
  async store(@Body() dto: CreateEventDto, @Req() req: Request) {
    const result = await this.eventsService.ingestOne(dto as unknown as Record<string, unknown>, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { id: result.event!.id };
  }

  @Post('batch')
  @HttpCode(202)
  async storeBatch(@Body() dto: CreateEventBatchDto, @Req() req: Request) {
    return this.eventsService.ingestBatch(dto.events, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
