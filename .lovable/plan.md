

## Fix: Week Range to Saturday-Friday (Inclusive)

### What Changes

The week range for analysis will be **previous Saturday 00:00 UTC** through **Friday 23:59:59 UTC** (the day before the cron runs). This ensures all activities are captured since the cron fires Saturday 06:30 UTC, well after Friday ends.

```text
Sat 00:00 -------- Fri 23:59:59  |  Sat 06:30
|<----- full week analyzed ----->|  ^ cron runs here
```

The cron job stays on Saturday at 06:30 UTC -- no schedule change needed.

### Technical Details

**File: `supabase/functions/generate-insights/index.ts`**

Replace `getPreviousWeekRange()` with:

```typescript
function getPreviousWeekRange(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // Sunday = 0, Saturday = 6

  // Calculate days back to the previous Saturday
  // Saturday = 6, so: if today is Saturday (6), go back 7 days
  // if today is Sunday (0), go back 1 day, Monday (1) go back 2, etc.
  const daysBackToSaturday = dayOfWeek === 6 ? 7 : dayOfWeek + 1;

  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - daysBackToSaturday);
  weekStart.setUTCHours(0, 0, 0, 0);

  // Week ends on Friday (6 days after Saturday)
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}
```

Day-of-week verification (when cron fires on Saturday):
- `dayOfWeek = 6` (Saturday) -> `daysBackToSaturday = 7` -> lands on previous Saturday
- `weekEnd = previous Saturday + 6 days = Friday 23:59:59`

**Same file -- add pre-computed stats to `buildPrompt()`:**

Before the raw logs JSON, inject a computed summary so the AI uses exact numbers:

```typescript
// Compute stats from weekLogs before building prompt
const totalSeconds = weekLogs.reduce((sum, l) => sum + l.duration, 0);
const totalHours = Math.floor(totalSeconds / 3600);
const totalMinutes = Math.round((totalSeconds % 3600) / 60);

const byTitle: Record<string, number> = {};
for (const log of weekLogs) {
  byTitle[log.title] = (byTitle[log.title] || 0) + log.duration;
}
const breakdown = Object.entries(byTitle)
  .sort((a, b) => b[1] - a[1])
  .map(([title, secs]) => `  - ${title}: ${(secs / 3600).toFixed(1)} hours (${((secs / totalSeconds) * 100).toFixed(1)}%)`)
  .join('\n');

const statsBlock = `
COMPUTED STATS (use these exact numbers, do NOT re-calculate from raw logs):
- Total tracked time: ${totalHours} hours ${totalMinutes} minutes
- Activity count: ${weekLogs.length} entries
- Breakdown by activity:
${breakdown}
`;
```

This block gets inserted into the prompt text right before the raw logs section.

**Update prompt week label** to say "Saturday to Friday" instead of "Sunday to Saturday" so the AI's text matches the actual range.

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/generate-insights/index.ts` | Fix `getPreviousWeekRange()` to Sat-Fri range; add pre-computed stats to prompt |

No cron job or database changes needed -- the schedule stays as-is on Saturday 06:30 UTC.

