'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import DayCard, { type CourtTimes, type DayState } from '@/components/DayCard';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Loader2, X } from 'lucide-react';

type DayItem = {
  date: string;
  state: DayState;
  courts?: CourtTimes[];
};

type Venue = { id: string; name: string; limitDays: number };
const VENUES: Venue[] = [
  { id: '1476', name: 'Air Padel', limitDays: 30 },
  { id: '1167', name: 'Republic Padel TB Simatupang', limitDays: 15 },
  { id: '1649', name: 'Naya Padel', limitDays: 30 },
  { id: '1710', name: 'Bumi Padel Kemang', limitDays: 15 },
  { id: '981', name: 'Basic Padel Resereve', limitDays: 8 },
  { id: '903', name: 'Futton Padel Club', limitDays: 59 },
];

function formatYYYYMMDDLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function nextNDays(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    out.push(formatYYYYMMDDLocal(d));
  }
  return out;
}

const delay = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = setTimeout(() => resolve(), ms);
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(id);
        reject(new DOMException('Aborted', 'AbortError'));
      });
    }
  });

export default function PadelFinder() {
  // Adjust this to control delay between day fetches
  const INTER_DAY_DELAY_MS = 250;
  const [venueId, setVenueId] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  // Start with no days listed until a search is performed
  const [days, setDays] = useState<DayItem[]>([]);

  const controllerRef = useRef<AbortController | null>(null);

  const availableCount = useMemo(
    () => days.filter((d) => d.state === 'success' && (d.courts?.length ?? 0) > 0).length,
    [days]
  );
  const visibleDays = useMemo(
    () => days.filter((d) => d.state !== 'idle' && d.state !== 'loading'),
    [days]
  );
  const progressedCount = useMemo(
    () => days.filter((d) => d.state !== 'idle' && d.state !== 'loading').length,
    [days]
  );
  const loadingDay = useMemo(
    () => days.find((d) => d.state === 'loading'),
    [days]
  );

  const clearDays = useCallback(() => {
    setDays([]);
  }, []);

  const selectVenue = (newId: string) => {
    setVenueId(newId);
    // Abort any in-progress run and reset state
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    setIsRunning(false);
    clearDays();
  };

  const stop = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    setIsRunning(false);
  };

  const run = useCallback(async () => {
    // Abort previous if any
    if (controllerRef.current) controllerRef.current.abort();

    const ctrl = new AbortController();
    controllerRef.current = ctrl;
    setIsRunning(true);

    // Generate next N days based on venue limit and pre-render as idle
    const limit = VENUES.find(v => v.id === venueId)?.limitDays ?? 30;
    const dates = nextNDays(limit);
    setDays(dates.map((d) => ({ date: d, state: 'idle' })));

    for (const date of dates) {
      // Mark loading
      setDays((prev) => prev.map((d) => (d.date === date ? { ...d, state: 'loading' } : d)));

      const attempt = async (): Promise<Response> =>
        fetch('/api/day', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ venueId, date }),
          signal: ctrl.signal,
        });

      try {
        let res = await attempt();
        if (!res.ok) {
          // Retry once on 429/5xx
          if (res.status === 429 || res.status >= 500) {
            await delay(1000, ctrl.signal);
            res = await attempt();
          }
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { courts: CourtTimes[] };
        const has = Array.isArray(data.courts) && data.courts.length > 0;
        setDays((prev) =>
          prev.map((d) =>
            d.date === date
              ? { ...d, state: has ? 'success' : 'empty', courts: data.courts ?? [] }
              : d
          )
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Stop loop silently
          break;
        }
        setDays((prev) => prev.map((d) => (d.date === date ? { ...d, state: 'error' } : d)));
      }

      try {
        await delay(INTER_DAY_DELAY_MS, ctrl.signal);
      } catch {
        break; // aborted
      }
    }

    setIsRunning(false);
  }, [venueId]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl">
      {/* Fixed top bar */}
      <div className="fixed top-0 left-0 right-0 z-10">
        <div className="bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-black/5 dark:border-white/10 px-3 sm:px-16 py-3 sm:py-4">
          <div className="mx-auto w-full max-w-4xl">
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={isRunning}>
                  <Button variant="outline" className="w-full sm:w-auto flex-1 justify-between">
                    {VENUES.find(v => v.id === venueId)?.name ?? 'Select Venue'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Select Venue</DropdownMenuLabel>
                  {VENUES.map(v => (
                    <DropdownMenuItem key={v.id} onSelect={() => selectVenue(v.id)}>
                      {v.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button size="icon" onClick={run} disabled={isRunning || !venueId} aria-label="Search" title="Search">
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="sr-only">Search</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer to offset fixed header height */}
      <div className="h-[56px] sm:h-[72px]" />

      {(visibleDays.length > 0 || loadingDay) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visibleDays.map((d) => (
            <DayCard key={d.date} date={d.date} state={d.state} courts={d.courts} />
          ))}
          {isRunning && loadingDay && (
            <DayCard key={loadingDay.date} date={loadingDay.date} state={loadingDay.state} />
          )}
        </div>
      )}

      {/* Spacer to offset fixed footer status */}
      {(isRunning || visibleDays.length > 0) && <div className="h-[44px] sm:h-[56px]" />}

      {/* Fixed bottom status bar */}
      {(isRunning || visibleDays.length > 0) && (
        <div className="fixed bottom-0 left-0 right-0 z-10">
          <div className="bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-black/5 dark:border-white/10 px-3 sm:px-16 py-2 sm:py-3">
            <div className="mx-auto w-full max-w-4xl">
              <div className="flex items-center justify-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                {isRunning ? (
                  <>
                    <span>Fetching {progressedCount}/{days.length} days…</span>
                    <Button size="icon" variant="outline" onClick={stop} aria-label="Stop" title="Stop">
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <span>Done: {availableCount} days have availability.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
