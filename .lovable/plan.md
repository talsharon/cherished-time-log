
## Fix Weekly AI Insights: Scheduling + Date Range Logic

### Problems Found

**Problem 1: No cron job exists**
The `pg_cron` extension is not enabled on this project, so there was never any scheduled weekly run. The function only worked when manually triggered from the button.

**Problem 2: Wrong week date range**
The current code calculates "this week" as Sunday-to-Saturday around *today*. When called on Saturday (trigger day), this means the analysis covers the current partial week, not the completed past week. It should always look at the **previous completed week** (last Sunday to last Saturday).

**Problem 3: No separation in the prompt between "this week" and "history"**
All 500 logs are sent in one flat list. The AI doesn't have a clear boundary showing which logs are from the analyzed week and which are historical context. The requirement is to analyze the past week and compare it with previous data.

---

### Solution

#### 1. Enable `pg_cron` + Schedule for Saturday 9:30 AM Israel Time (UTC+2/+3)

Israel Standard Time (IST) is UTC+2 in winter and UTC+3 in summer (DST). To safely target 9:30 AM IST year-round, we'll use UTC 7:30 (which is 9:30 IST in winter/UTC+2) and note this may be 10:30 in summer. A robust approach is to schedule at **06:30 UTC** to accommodate both IST (UTC+2, so 8:30 AM) and IDT (UTC+3, so 9:30 AM):

Actually the simplest approach: Saturday 9:30 AM Israel Time. IST = UTC+2, IDT = UTC+3.
- In winter (IST): 9:30 AM = 07:30 UTC  
- In summer (IDT): 9:30 AM = 06:30 UTC  

We'll pick **07:30 UTC Saturday** — this hits 9:30 AM in winter and 10:30 AM in summer. Alternatively, we can pick **06:30 UTC** to hit 8:30 AM in winter and 9:30 AM in summer. Given DST is active for most of the year in Israel, we'll use **06:30 UTC on Saturdays**, which gives 9:30 AM IDT (summer) and 8:30 AM IST (winter). This is the closest fixed UTC equivalent.

Cron expression: `30 6 * * 6` (06:30 UTC every Saturday)

The cron job will call all users' `generate-insights` function. Since the current function is user-scoped (requires an auth token), the cron approach requires iterating over users using the service role.

**Architecture for scheduled runs:**
- The cron job calls a backend function (using `pg_net` + `net.http_post`) with the service role key
- The edge function detects when called without a user token (system call) and processes all users
- When called with a user token (manual button), it processes only that user — existing behavior preserved

#### 2. Fix Week Date Logic

The "analyzed week" should always be the **last completed week**: the Sunday-to-Saturday period that ended before today.

```typescript
// Always analyze the PREVIOUS completed week (Sunday to Saturday)
const now = new Date();
// "now" in Israel time context — the function runs Saturday morning
// The previous week ended last Saturday
const dayOfWeek = now.getDay(); // Saturday = 6
// Go back to last Sunday (start of the week being analyzed)
const daysToLastSunday = dayOfWeek + 1; // +1 more day back to get to LAST Sunday, not this Sunday
const weekStart = new Date(now);
weekStart.setDate(now.getDate() - daysToLastSunday);
weekStart.setUTCHours(0, 0, 0, 0);

const weekEnd = new Date(weekStart);
weekEnd.setDate(weekStart.getDate() + 6);
weekEnd.setUTCHours(23, 59, 59, 999);
```

#### 3. Fix Prompt: Separate "This Week" vs "Historical" Logs

Fetch logs in two separate queries:
- **This week's logs**: filtered by `start_time` between `weekStart` and `weekEnd`
- **Historical logs**: the previous 500 logs *excluding* this week

Pass them separately to the prompt with clear labels so the AI can compare the current week against history.

```typescript
// Week logs — what we're analyzing
const { data: weekLogs } = await supabase
  .from("logs")
  .select("title, comment, start_time, duration")
  .eq("user_id", userId)
  .gte("start_time", weekStart.toISOString())
  .lte("start_time", weekEnd.toISOString())
  .order("start_time", { ascending: true });

// Historical logs — for comparison (up to 500, before this week)
const { data: historicalLogs } = await supabase
  .from("logs")
  .select("title, comment, start_time, duration")
  .eq("user_id", userId)
  .lt("start_time", weekStart.toISOString())
  .order("start_time", { ascending: false })
  .limit(500);
```

The prompt will then present them in two clearly labeled sections.

---

### Files to Modify

| What | Description |
|------|-------------|
| Database (migration) | Enable `pg_cron` + `pg_net` extensions |
| Database (insert, not migration) | Create cron job scheduled for Saturday 06:30 UTC |
| `supabase/functions/generate-insights/index.ts` | Fix week date range, split logs into week vs history, add system-call mode for all users |

---

### Cron Job (System Call Mode)

The cron will POST to the edge function with the service role key (no user token). The edge function will detect this and loop through all users, generating insights for each:

```typescript
// Detect system call vs user call
const isSystemCall = authHeader === `Bearer ${supabaseServiceKey}`;

if (isSystemCall) {
  // Fetch all users from active_sessions and process each
  const { data: users } = await adminClient.from('active_sessions').select('user_id');
  for (const { user_id } of users) {
    await processUserInsights(adminClient, user_id, weekStart, weekEnd);
  }
} else {
  // Normal user call — extract user from JWT
  const { data: { user } } = await supabase.auth.getUser(token);
  await processUserInsights(supabase, user.id, weekStart, weekEnd);
}
```

This keeps the manual button working exactly as before while enabling automated weekly runs for all users.
