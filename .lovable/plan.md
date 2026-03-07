

## Test Cron Job - One-Time Run

We'll create a temporary one-time cron job that runs in ~10 minutes to verify the fix works, then remove it.

### Steps

1. **Create a one-time test cron job** scheduled to run at the next upcoming minute mark (~10 minutes from now). Since I don't know the exact current time, I'll schedule it using a one-time `cron.schedule` that runs every minute for a short window, then immediately unschedule it after one execution.

**Simpler approach:** Use `net.http_post` directly as a one-off SQL call (no cron needed) to test if the headers work:

```sql
SELECT net.http_post(
  url := 'https://zpjltjjqzkqwpufxceqq.supabase.co/functions/v1/generate-insights',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
    'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
  ),
  body := '{"system_call": true}'::jsonb,
  timeout_milliseconds := 120000
) AS request_id;
```

This fires the exact same HTTP request the cron job would send — same URL, same headers, same body — but immediately. No need to wait 10 minutes. After it runs, we check `net._http_response` for the result and verify the edge function logs to confirm it worked.

2. **Wait ~30 seconds** for the request to complete (the function needs time to call the AI gateway).

3. **Check the response** in `net._http_response` and edge function logs to confirm success.

This tests the exact same code path as the cron job without needing to schedule anything.

