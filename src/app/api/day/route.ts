import { NextRequest, NextResponse } from "next/server";

// Simple in-memory cache with TTL
const TTL_MS = 60_000; // 60s
const cache = new Map<string, { data: DayResponse; expiresAt: number }>();

export type CourtTimes = { court: string; times: string[] };
export type DayResponse = {
  venue_id: string;
  date: string; // YYYY-MM-DD
  courts: CourtTimes[]; // empty if none
};

function isValidDateStr(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const venueId = String(body?.venueId ?? "").trim();
    const date = String(body?.date ?? "").trim();

    if (!venueId || !isValidDateStr(date)) {
      return NextResponse.json(
        { error: "Invalid body. Expect { venueId: string, date: 'YYYY-MM-DD' }" },
        { status: 400 }
      );
    }

    const key = `${venueId}:${date}`;
    const now = Date.now();
    const entry = cache.get(key);
    if (entry && entry.expiresAt > now) {
      return NextResponse.json(entry.data, { status: 200 });
    }

    const url = `https://ayo.co.id/venues-ajax/op-times-and-fields?venue_id=${encodeURIComponent(
      venueId
    )}&date=${encodeURIComponent(date)}`;

    const res = await fetch(url, {
      method: "GET",
      // Avoid Next.js fetch caching for this proxy
      cache: "no-store",
      headers: {
        "accept": "application/json, */*",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Upstream error: ${res.status}` }, { status: res.status });
    }

    const json = await res.json().catch(() => ({} as any));

    // Tolerant extraction of fields
    const fields: any[] = Array.isArray((json as any).fields)
      ? (json as any).fields
      : Array.isArray((json as any)?.data?.fields)
      ? (json as any).data.fields
      : [];

    const courts: CourtTimes[] = fields
      .map((f) => {
        const fieldName: string = f?.field_name ?? f?.name ?? "Court";
        const slots: any[] = Array.isArray(f?.slots) ? f.slots : [];
        const times: string[] = slots
          .filter((s) => {
            const v = (s?.is_available ?? s?.available ?? 0) as any;
            return v === 1 || v === "1" || v === true;
          })
          .map((s) => String(s?.start_time ?? s?.time ?? "").slice(0, 5))
          .filter(Boolean);
        return { court: fieldName, times };
      })
      .filter((c) => c.times.length > 0);

    const payload: DayResponse = { venue_id: venueId, date, courts };

    cache.set(key, { data: payload, expiresAt: now + TTL_MS });

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
