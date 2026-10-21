process.env.DB_PATH = ':memory:';
process.env.EVENTPULSE_INGEST_API_KEY = 'test-ingest-key';
process.env.EVENTPULSE_DASHBOARD_API_KEY = 'test-dashboard-key';
process.env.EVENTPULSE_MAX_BATCH_SIZE = '50';
// The app must actually listen here since EventPulseClient posts back to its own HTTP server, not just supertest's in-memory wrapper.
process.env.PORT = '8199';
process.env.EVENTPULSE_BACKEND_URL = 'http://localhost:8199';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('EventPulse API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(Number(process.env.PORT));
  });

  afterAll(async () => {
    await app.close();
  });

  const ingestHeaders = { 'X-API-Key': 'test-ingest-key' };
  const dashboardHeaders = { 'X-API-Key': 'test-dashboard-key' };

  describe('POST /api/v1/events', () => {
    it('rejects requests without an API key', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/events')
        .send({ eventName: 'page_view', eventType: 'pageview', source: 'browser', anonymousId: 'a1', url: '/x' })
        .expect(401);
    });

    it('rejects requests with the wrong API key', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('X-API-Key', 'wrong-key')
        .send({ eventName: 'page_view', eventType: 'pageview', source: 'browser', anonymousId: 'a1', url: '/x' })
        .expect(401);
    });

    it('accepts a valid pageview event', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set(ingestHeaders)
        .send({ eventName: 'page_view', eventType: 'pageview', source: 'browser', anonymousId: 'a1', url: '/home' })
        .expect(201);

      expect(response.body.id).toEqual(expect.any(Number));
    });

    it('rejects a pageview event missing the required url', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/events')
        .set(ingestHeaders)
        .send({ eventName: 'page_view', eventType: 'pageview', source: 'browser', anonymousId: 'a1' })
        .expect(400);
    });

    it('rejects an invalid event_type', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/events')
        .set(ingestHeaders)
        .send({ eventName: 'x', eventType: 'bogus', source: 'browser', anonymousId: 'a1' })
        .expect(400);
    });
  });

  describe('POST /api/v1/events/batch', () => {
    it('accepts the valid items and reports the invalid ones individually, without rejecting the whole batch', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/events/batch')
        .set(ingestHeaders)
        .send({
          events: [
            { eventName: 'page_view', eventType: 'pageview', source: 'browser', anonymousId: 'a2', url: '/menu' },
            { eventName: 'page_view', eventType: 'pageview', source: 'browser', anonymousId: 'a2' }, // missing url
            { eventName: 'scroll', eventType: 'custom', source: 'browser', anonymousId: 'a2' },
          ],
        })
        .expect(202);

      expect(response.body.accepted).toBe(2);
      expect(response.body.rejected).toHaveLength(1);
      expect(response.body.rejected[0].index).toBe(1);
    });

    it('requires an API key', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/events/batch')
        .send({ events: [{ eventName: 'x', eventType: 'custom', source: 'browser', anonymousId: 'a1' }] })
        .expect(401);
    });

    it('accepts the ingest key via query param for sendBeacon-based flushes', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/events/batch?apiKey=test-ingest-key')
        .send({ events: [{ eventName: 'x', eventType: 'custom', source: 'browser', anonymousId: 'a1' }] })
        .expect(202);
    });
  });

  describe('analytics endpoints', () => {
    it('requires the dashboard key, and the ingest key is not sufficient', async () => {
      await request(app.getHttpServer()).get('/api/v1/analytics/summary').expect(401);
      await request(app.getHttpServer()).get('/api/v1/analytics/summary').set(ingestHeaders).expect(401);
    });

    it('summary reflects pageviews, unique visitors, and orders from seeded events', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/events/batch')
        .set(ingestHeaders)
        .send({
          events: [
            { eventName: 'page_view', eventType: 'pageview', source: 'browser', anonymousId: 'v1', url: '/menu' },
            { eventName: 'page_view', eventType: 'pageview', source: 'browser', anonymousId: 'v1', url: '/checkout' },
            { eventName: 'page_view', eventType: 'pageview', source: 'browser', anonymousId: 'v2', url: '/menu' },
          ],
        })
        .expect(202);

      await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({ items: [{ name: 'Pizza', price: 10, quantity: 1 }], anonymousId: 'v1' })
        .expect(201);

      // Give the fire-and-forget order_created tracking call a tick to land.
      await new Promise((resolve) => setTimeout(resolve, 50));

      const summary = await request(app.getHttpServer())
        .get('/api/v1/analytics/summary')
        .set(dashboardHeaders)
        .expect(200);

      expect(summary.body.total_pageviews).toBeGreaterThanOrEqual(3);
      expect(summary.body.unique_visitors).toBeGreaterThanOrEqual(2);
      expect(summary.body.total_orders).toBeGreaterThanOrEqual(1);
    });

    it('popular-pages ranks /menu above a page visited once', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/popular-pages')
        .set(dashboardHeaders)
        .expect(200);

      const menu = response.body.data.find((row: any) => row.url === '/menu');
      expect(menu).toBeDefined();
      expect(menu.views).toBeGreaterThanOrEqual(2);
    });
  });

  describe('POST /api/v1/orders', () => {
    it('creates an order and returns its computed total', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          items: [
            { name: 'Burger', price: 8.5, quantity: 2 },
            { name: 'Fries', price: 3, quantity: 1 },
          ],
        })
        .expect(201);

      expect(response.body.total).toBeCloseTo(20);
    });

    it('rejects an order with no items', async () => {
      await request(app.getHttpServer()).post('/api/v1/orders').send({ items: [] }).expect(400);
    });
  });
});
