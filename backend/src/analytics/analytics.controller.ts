import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/api-key.guard';
import { RequireApiKey } from '../common/api-key.decorator';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRangeDto } from './dto/analytics-range.dto';
import { resolveRange } from './date-range.util';

@Controller('v1/analytics')
@UseGuards(ApiKeyGuard)
@RequireApiKey('dashboard')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  async summary(@Query() query: AnalyticsRangeDto) {
    const { from, to } = resolveRange(query.from, query.to);
    return this.analyticsService.summary(from, to);
  }

  @Get('popular-pages')
  async popularPages(@Query() query: AnalyticsRangeDto) {
    const { from, to } = resolveRange(query.from, query.to);
    return { data: await this.analyticsService.popularPages(from, to, query.limit ?? 10) };
  }

  @Get('trends')
  async trends(@Query() query: AnalyticsRangeDto) {
    const { from, to } = resolveRange(query.from, query.to);
    return { data: await this.analyticsService.trends(from, to, query.interval ?? 'day') };
  }

  @Get('events')
  async events(@Query() query: AnalyticsRangeDto) {
    const { from, to } = resolveRange(query.from, query.to);
    return this.analyticsService.events(from, to, query.eventName, query.page ?? 1);
  }
}
