# Padel Court Availability Finder – Implementation Plan

## Goal
A simple React/Next.js app where the user can select a **padel venue** from a dropdown, click **Search**, and see availability for the next 30 days.  
Availability is fetched **one day at a time** with polite delays, and results are rendered as soon as they are ready.

---

## UX

- **Top Row**
  - Dropdown with venues (Air Padel, Republic Padel TB Simatupang, Naya Padel, Bumi Padel Kemang)
  - Search button

- **Below**
  - 30 **day cards** in chronological order.
  - Each card has:
    - Title (e.g. “Sun, 14 Sep 2025”)
    - State: *Loading…* → *Results* → *No availability* → (on error) *Retry once* → *Failed*

- **Footer**
  - Simple summary, e.g. “Done: X days have availability.”

---

## Data Contract

- **Input**
  ```ts
  { venueId: string }
  ```

- **Internal Endpoint** `/api/day`
  - **Request**
    ```ts
    { venueId: string, date: "YYYY-MM-DD" }
    ```
  - **Response**
    ```ts
    {
      venue_id: string,
      date: string,
      courts: { court: string, times: string[] }[]
    }
    ```
    - `courts` is empty if no slots.

---

## Flow

1. User selects venue and clicks **Search**.
2. App pre-renders 30 day-cards with date labels and skeleton states.
3. Sequential loop:
   - Mark card as **Loading**.
   - Call `/api/day` with `{ venueId, date }`.
   - If 200:
     - Render courts with times, or show “No available slots.”
   - If error:
     - Retry once with backoff.
     - If still failing → mark as **Failed**.
   - Wait ≥ 800ms before moving to the next date.
4. When all finished, show summary.

---

## Components

- **Page**
  - Dropdown + Search
  - List of `DayCard`s

- **DayCard**
  - Props: `date`, `state`, `courts?`
  - States:
    - *Loading* → spinner/skeleton
    - *Success* → list of courts & times
    - *Empty* → “No available slots.”
    - *Error* → “Failed to fetch”

- **(Optional) SummaryBar**
  - Shows totals, e.g. “6 days with availability.”

---

## State Model

```ts
{
  venueId: string,
  isRunning: boolean,
  days: Array<{
    date: string,
    state: "idle"|"loading"|"success"|"empty"|"error",
    courts?: { court: string, times: string[] }[]
  }>,
  controller: AbortController | null
}
```

- Transition: `idle → loading → success | empty | error`
- Abort controller for cancellation if venue changes mid-run.

---

## Backend

- **Endpoint:** `/api/day` (POST)
- Validates body.
- Caches `{venueId}:{date}` in memory for 60s.
- Calls `https://ayo.co.id/venues-ajax/op-times-and-fields?venue_id={id}&date={date}`
- Maps response:
  ```ts
  courts = fields.map(f => ({
    court: f.field_name,
    times: f.slots
      .filter(s => s.is_available == 1)
      .map(s => s.start_time.slice(0,5))
  })).filter(c => c.times.length > 0)
  ```
- Returns `courts: []` if none.

### Politeness
- Client enforces ~800ms delay between days.
- Retry on 429/5xx with backoff.

---

## Date Generation

- Generate next 30 calendar days in local timezone.
- Store as `YYYY-MM-DD` for API, display human-readable.

---

## Errors & Edge Cases

- Closed days → `courts: []` → “No available slots.”
- Network errors → retry once, else mark **Failed**.
- Venue change mid-run → abort and restart.

---

## Performance & UX

- Render all 30 day-cards upfront to avoid layout shift.
- Show progress text like “Fetching 7/30 days…” (optional).
- Disable Search button while running.

---

## Venues (Dropdown Seeds)

- `1476` — Air Padel  
- `1167` — Republic Padel TB Simatupang  
- `1649` — Naya Padel  
- `1710` — Bumi Padel Kemang

---

## Test Checklist

- 30 sequential requests with ~800ms delay.
- Per-day results render as they arrive.
- Empty days → “No available slots.”
- Errors → marked as “Failed,” loop continues.
- Switching venue mid-run cancels and restarts.
