'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TrendPoint } from '@/lib/analytics';

export function TrendsChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-neutral-500">No events in this range yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Line type="monotone" dataKey="pageviews" name="Page views" stroke="#111827" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="other_events" name="Other events" stroke="#9ca3af" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
