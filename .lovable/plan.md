

## Fix: Cron Job Timeout for Weekly Insights

### Root Cause

The weekly cron job uses `net.http_post()` which has a **5-second default timeout**. The `generate-insights` function needs significantly more time because it:
1. Fetches logs from the database
2. Calls the AI gateway (which can take 10-30+ seconds)
3. Saves the insight
4. Triggers the push notification

The DB log confirms the timeout:
```
Timeout of 5000 ms reached. Total time: 5001.203 ms
```

### Fix

Update the cron job SQL to pass a longer timeout (e.g., 120 seconds) using the `timeout_milliseconds` parameter of `net.http_post()`:

```sql
-- Drop the existing cron job
SELECT cron.unschedule('weekly-insights-saturday');

-- Re-create with a 120-second timeout
SELECT cron.schedule(
  'weekly-insights-saturday',
  '30 6 * * 6',
  $$
  SELECT net.http_post(
    url := 'https://zpjltjjqzkqwpufxceqq.supabase.co/functions/v1/generate-insights',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{"system_call": true}'::jsonb,
    timeout_milliseconds := 120000
  ) AS request_id;
  $$
);
```

### What This Changes

| Before | After |
|--------|-------|
| 5-second timeout (default) | 120-second timeout |
| Function times out, no insight generated | Function has enough time to complete |
| No push notification sent | Push notification fires after insight is saved |

### Additional Step: Verify `send-push-notification` Deployment

The `send-push-notification` edge function has zero logs, meaning it may have never been successfully deployed. After fixing the cron timeout, we should also deploy this function and test it to ensure push notifications work end-to-end.

### Files to Modify

| File | Action | Description |
|------|--------|-------------|
| Database migration | Create | Drop and re-create cron job with 120s timeout |

No code file changes are needed -- this is purely a database/cron configuration fix.

