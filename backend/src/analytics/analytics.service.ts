import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../events/event.entity';
import { toSqliteDatetime } from './date-range.util';

@Injectable()
export class AnalyticsService {
  constructor(@InjectRepository(Event) private readonly eventsRepository: Repository<Event>) {}

  async summary(from: Date, to: Date) {
    const range = { from: toSqliteDatetime(from), to: toSqliteDatetime(to) };
    const base = () =>
      this.eventsRepository.createQueryBuilder('e').where('e.occurred_at BETWEEN :from AND :to', range);

    const [totalEvents, totalPageviews, uniqueVisitors, totalOrders] = await Promise.all([
      base().getCount(),
      base().andWhere('e.event_type = :type', { type: 'pageview' }).getCount(),
      // Scoped to pageviews only: server-originated events (e.g. order_created)
      // don't carry a real visitor identity and would otherwise inflate this count.
      base()
        .andWhere('e.event_type = :type', { type: 'pageview' })
        .select('COUNT(DISTINCT e.anonymous_id)', 'count')
        .getRawOne<{ count: string }>()
        .then((row) => Number(row?.count ?? 0)),
      base().andWhere('e.event_name = :name', { name: 'order_created' }).getCount(),
    ]);

    return {
      total_events: totalEvents,
      total_pageviews: totalPageviews,
      unique_visitors: uniqueVisitors,
      total_orders: totalOrders,
      from: from.toISOString(),
      to: to.toISOString(),
    };
  }

  async popularPages(from: Date, to: Date, limit = 10) {
    const range = { from: toSqliteDatetime(from), to: toSqliteDatetime(to) };

    const rows = await this.eventsRepository
      .createQueryBuilder('e')
      .select('e.url', 'url')
      .addSelect('COUNT(*)', 'views')
      .addSelect('COUNT(DISTINCT e.anonymous_id)', 'unique_visitors')
      .where('e.occurred_at BETWEEN :from AND :to', range)
      .andWhere('e.event_type = :type', { type: 'pageview' })
      .andWhere('e.url IS NOT NULL')
      .groupBy('e.url')
      .orderBy('views', 'DESC')
      .limit(limit)
      .getRawMany<{ url: string; views: string; unique_visitors: string }>();

    return rows.map((row) => ({
      url: row.url,
      views: Number(row.views),
      unique_visitors: Number(row.unique_visitors),
    }));
  }

  /**
   * Daily/hourly time series of pageviews vs. all other events, so the
   * dashboard can plot traffic trends. SQLite-only grouping for this demo.
   */
  async trends(from: Date, to: Date, interval: 'hour' | 'day' = 'day') {
    const range = { from: toSqliteDatetime(from), to: toSqliteDatetime(to) };
    const format = interval === 'hour' ? '%Y-%m-%d %H:00:00' : '%Y-%m-%d';

    const rows = await this.eventsRepository
      .createQueryBuilder('e')
      .select(`strftime('${format}', e.occurred_at)`, 'bucket')
      .addSelect("SUM(CASE WHEN e.event_type = 'pageview' THEN 1 ELSE 0 END)", 'pageviews')
      .addSelect("SUM(CASE WHEN e.event_type != 'pageview' THEN 1 ELSE 0 END)", 'other_events')
      .addSelect('COUNT(*)', 'total_events')
      .where('e.occurred_at BETWEEN :from AND :to', range)
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany<{ bucket: string; pageviews: string; other_events: string; total_events: string }>();

    return rows.map((row) => ({
      bucket: row.bucket,
      pageviews: Number(row.pageviews),
      other_events: Number(row.other_events),
      total_events: Number(row.total_events),
    }));
  }

  async events(from: Date, to: Date, eventName: string | undefined, page: number, perPage = 25) {
    const range = { from: toSqliteDatetime(from), to: toSqliteDatetime(to) };

    const query = this.eventsRepository
      .createQueryBuilder('e')
      .where('e.occurred_at BETWEEN :from AND :to', range)
      .orderBy('e.occurred_at', 'DESC')
      .skip((page - 1) * perPage)
      .take(perPage);

    if (eventName) {
      query.andWhere('e.event_name = :eventName', { eventName });
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      meta: {
        current_page: page,
        last_page: Math.max(1, Math.ceil(total / perPage)),
        total,
      },
    };
  }
}
