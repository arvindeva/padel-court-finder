'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export type CourtTimes = { court: string; times: string[] };
export type DayState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export function formatDisplayDate(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });
}

export default function DayCard({
  date,
  state,
  courts,
}: {
  date: string;
  state: DayState;
  courts?: CourtTimes[];
}) {
  const hasConsecutive = (times: string[], t: string) => {
    const toMinutes = (s: string) => {
      const [hh, mm] = s.split(":").map((n) => parseInt(n, 10));
      return (hh % 24) * 60 + (mm % 60);
    };
    const toHHMM = (m: number) => {
      const total = ((m % 1440) + 1440) % 1440;
      const hh = String(Math.floor(total / 60)).padStart(2, "0");
      const mm = String(total % 60).padStart(2, "0");
      return `${hh}:${mm}`;
    };
    const set = new Set(times);
    const m = toMinutes(t);
    const next = toHHMM(m + 60);
    const prev = toHHMM(m - 60);
    return set.has(next) || set.has(prev);
  };
  return (
    <Card className="w-full gap-0 py-3">
      <CardHeader className="py-1 pb-0 px-4">
        <CardTitle className="text-base font-semibold">{formatDisplayDate(date)}</CardTitle>
      </CardHeader>
      <CardContent className="pt-1 pb-2 px-4">
        {state === 'loading' && (
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Searching…</span>
          </div>
        )}
        {state === 'success' && courts && courts.length > 0 && (
          <div className="space-y-0">
            {courts.map((c) => (
              <div key={c.court}>
                <div className="text-sm font-medium">{c.court}</div>
                <div className="text-sm text-gray-700 dark:text-gray-300 flex flex-wrap gap-x-2 gap-y-1">
                  {c.times.map((t, idx) => (
                    <span key={t + idx} className={hasConsecutive(c.times, t) ? 'text-green-600 dark:text-green-500 font-medium' : undefined}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {state === 'empty' && (
          <div className="text-sm text-gray-500">No available slots.</div>
        )}
        {state === 'error' && (
          <div className="text-sm text-red-600">Failed to fetch.</div>
        )}
      </CardContent>
    </Card>
  );
}
