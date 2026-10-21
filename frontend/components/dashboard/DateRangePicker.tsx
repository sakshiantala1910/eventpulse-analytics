'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const PRESETS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function DateRangePicker({ from, to }: { from?: string; to?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function applyPreset(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    pushRange(isoDate(start), isoDate(end));
  }

  function pushRange(nextFrom: string, nextTo: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('from', nextFrom);
    params.set('to', nextTo);
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyPreset(preset.days)}
            className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
          >
            Last {preset.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <input
          type="date"
          defaultValue={from}
          onChange={(event) => pushRange(event.target.value, to ?? isoDate(new Date()))}
          className="rounded-md border border-neutral-300 px-2 py-1.5"
        />
        <span className="text-neutral-400">to</span>
        <input
          type="date"
          defaultValue={to}
          onChange={(event) => pushRange(from ?? isoDate(new Date()), event.target.value)}
          className="rounded-md border border-neutral-300 px-2 py-1.5"
        />
      </div>
    </div>
  );
}
