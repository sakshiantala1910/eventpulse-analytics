import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { TrendsChart } from '@/components/dashboard/TrendsChart';
import { getPopularPages, getSummary, getTrends } from '@/lib/analytics';

function formatDateInput(iso: string): string {
  return iso.slice(0, 10);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;

  const [summary, popularPages, trends] = await Promise.all([
    getSummary(from, to),
    getPopularPages(from, to),
    getTrends(from, to),
  ]);

  const cards = [
    { label: 'Page views', value: summary.total_pageviews },
    { label: 'Unique visitors', value: summary.unique_visitors },
    { label: 'Orders', value: summary.total_orders },
    { label: 'Total events', value: summary.total_events },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Analytics dashboard</h1>
        <DateRangePicker from={formatDateInput(summary.from)} to={formatDateInput(summary.to)} />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{card.label}</p>
            <p className="mt-2 text-2xl font-bold">{card.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Traffic trend</h2>
        <div className="mt-4">
          <TrendsChart data={trends} />
        </div>
      </div>

      <div className="mt-10 rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Popular pages</h2>
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-neutral-500">
              <th className="py-2 font-medium">Page</th>
              <th className="py-2 font-medium">Views</th>
              <th className="py-2 font-medium">Unique visitors</th>
            </tr>
          </thead>
          <tbody>
            {popularPages.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-neutral-500">
                  No page views in this range yet.
                </td>
              </tr>
            )}
            {popularPages.map((page) => (
              <tr key={page.url} className="border-b border-neutral-100">
                <td className="py-2 font-mono text-xs">{page.url}</td>
                <td className="py-2">{page.views}</td>
                <td className="py-2">{page.unique_visitors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
