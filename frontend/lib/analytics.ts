import 'server-only';

const BACKEND_URL = process.env.EVENTPULSE_BACKEND_URL ?? 'http://localhost:8000';
const DASHBOARD_API_KEY = process.env.EVENTPULSE_DASHBOARD_API_KEY ?? '';

export interface Summary {
  total_events: number;
  total_pageviews: number;
  unique_visitors: number;
  total_orders: number;
  from: string;
  to: string;
}

export interface PopularPage {
  url: string;
  views: number;
  unique_visitors: number;
}

export interface TrendPoint {
  bucket: string;
  pageviews: number;
  other_events: number;
  total_events: number;
}

async function dashboardFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    headers: { 'X-API-Key': DASHBOARD_API_KEY },
    cache: 'no-store', // dashboard always shows request-time data
  });

  if (!response.ok) {
    throw new Error(`EventPulse analytics request failed: ${path} -> ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function rangeQuery(from?: string, to?: string): string {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function getSummary(from?: string, to?: string): Promise<Summary> {
  return dashboardFetch<Summary>(`/api/v1/analytics/summary${rangeQuery(from, to)}`);
}

export async function getPopularPages(from?: string, to?: string): Promise<PopularPage[]> {
  const { data } = await dashboardFetch<{ data: PopularPage[] }>(`/api/v1/analytics/popular-pages${rangeQuery(from, to)}`);
  return data;
}

export async function getTrends(from?: string, to?: string): Promise<TrendPoint[]> {
  const { data } = await dashboardFetch<{ data: TrendPoint[] }>(`/api/v1/analytics/trends${rangeQuery(from, to)}`);
  return data;
}
